import yaml from 'js-yaml';
import { Octokit } from 'octokit';
import { base64Decode, fixedGitHubURL } from '../helpers/helpers';
import * as winston from 'winston';
import { createSingleFilePullRequest } from './github-push-to-branch-service';
import { RolloutsConfig } from '../domain/RolloutsConfig';


export function rolloutsStringValues(rolloutsConfig: RolloutsConfig): string {
  return `      rollingDynamicStableScale: true
      rollingUpdateMaxSurge: 25%
      abortScaleDownDelaySeconds: 30
      rollingUpdateMaxUnavailable: '0%'
      rollouts:
        enabled: true
        type: canary
        strategyCanarySteps:
          duration: ${rolloutsConfig.duration}
          weights: ${rolloutsConfig.weights}
      analysis:
        enabled: true
        metrics:
          - name: ${rolloutsConfig.type}
            interval: ${rolloutsConfig.interval}
            successCondition: ${rolloutsConfig.analysisSuccessCondition}
            provider:
              web:
                url: ${rolloutsConfig.analysisUrl}
                timeoutSeconds: ${rolloutsConfig.timeout}`;
}

// Function to add rollouts config to each API object
export function addRollout(data: any, rolloutsConfig: RolloutsConfig): [boolean, string] {

  let valuesYAML = data;
  const parsedYaml: any = yaml.load(data);
  let added = false;
  // TODO: Caso tenha nome de chart customizados podemos pegar via parametro do plugin
  const keys = ['picpay-ms-v2', 'picpay-ms-v2-qa', 'picpay-ms-v2-prod'];
  keys.forEach((key) => {
    const value = parsedYaml[key];
    if (parsedYaml.hasOwnProperty(key) && Array.isArray(value?.apis)) {
      value.apis.forEach((api: any) => {
        if (!api.hasOwnProperty('rollouts')) {
          const regex = new RegExp(`- name: "?${api.name}"?`);
          valuesYAML = valuesYAML.replace(regex, `- name: ${api.name}\n${rolloutsStringValues(rolloutsConfig)}`);
          added = true;
        }
      });
    }
  });
  return [added, valuesYAML];
}

export function inspectForRolloutsValues(
  appValues: any,
  rolloutsConfig: RolloutsConfig,
): [needToAddRolloutsNodepool: boolean, updatedContent: string] {
  const [rolloutAdded, returnValues] = addRollout(appValues, rolloutsConfig);
  if (rolloutAdded) {
    return [true, returnValues];
  }
  return [false, ''];
}

export const valuesConfig = async (
  logger: winston.Logger,
  githubAPI: Octokit,
  rolloutsConfig: RolloutsConfig,
  clusterRepository: string,
  filePath: string,
): Promise<[needToAddRolloutsConfig: boolean, updatedValuesContent: string]> => {

  let getContentResponse;
  try {
    getContentResponse = await githubAPI.rest.repos.getContent({
      owner: 'PicPay',
      repo: clusterRepository,
      path: filePath,
      branch: 'main',
    });
  } catch (error) {
    logger.error('Error fetching file content:', error.response?.data);
  }

  if (getContentResponse?.status === 200) {
    const clusterConfig = Array.isArray(getContentResponse?.data) ?
      base64Decode(getContentResponse?.data[0]?.content) :
      // @ts-ignore
      base64Decode(getContentResponse?.data?.content);
    return inspectForRolloutsValues(clusterConfig, rolloutsConfig);
  }
  return [false, ''];
};

export function changeDepName(data: any) {
  // Modify the key from 'picpay-ms-v2' to 'picpay-ms-v2-qa'
  return data.replace('picpay-ms-v2', 'picpay-ms-v2-qa');
}

export async function argoRolloutChecksValues(logger: winston.Logger,
  octokit: Octokit,
  rolloutsConfig: RolloutsConfig,
  needToChangeQAChartName: boolean,
  infraRepositoryName: string,
  valuesFilePath: string,
  outputArray: [message: string][]): Promise<[message: string][]> {
  // eslint-disable-next-line prefer-const
  let [needToSetValues, updateValuesContent] = await valuesConfig(
    logger,
    octokit,
    rolloutsConfig,
    infraRepositoryName,
    valuesFilePath);

  if (!needToSetValues) {
    logger.info(`Rollouts already configured or can't be configured on ${infraRepositoryName}`);
    return outputArray;
  }

  // Se o nome da dependência for picpay-ms-v2 em hom mudar para picpay-ms-v2-qa
  if (needToSetValues && needToChangeQAChartName)
    updateValuesContent = changeDepName(updateValuesContent);

  const newBranchName = `feat/rollouts-deploy-strategy-${Date.now()}`;

  // PR para atualizar o values
  const prURL = await createSingleFilePullRequest(octokit,
    infraRepositoryName,
    newBranchName,
    valuesFilePath,
    updateValuesContent,
    'Add canary deploy strategy configuration');
  outputArray.push([`Atualização do chart values ${fixedGitHubURL(prURL)}`]);

  return outputArray;
}
