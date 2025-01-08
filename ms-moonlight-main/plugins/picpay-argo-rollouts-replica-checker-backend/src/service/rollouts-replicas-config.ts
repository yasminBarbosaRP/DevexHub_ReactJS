import yaml from 'js-yaml';
import { Octokit } from 'octokit';
import { base64Decode, fixedGitHubURL } from '../helpers/helpers';
import * as winston from 'winston';
import { createSingleFilePullRequest } from './github-push-to-branch-service';


export function inspectForRolloutsReplicas(
  clusterRolloutsConfig: any,
  logger: winston.Logger,
): [error: boolean, needToSetReplicas: boolean, updatedValuesContent: string] {

  const valuesYaml = yaml.load(clusterRolloutsConfig);

  const replicas = (valuesYaml as any)['argo-rollouts'].controller.replicas;

  if (replicas === 0) {
    (valuesYaml as any)['argo-rollouts'].controller.replicas = 1;
    const updatedContent = yaml.dump(valuesYaml);

    return [false, true, updatedContent];
  }
  logger.info('Argo Rollouts replicas is already set in the cluster configuration.');
  return [false, false, yaml.dump(valuesYaml)];
}

export const rolloutsReplicasConfig = async (
  logger: winston.Logger,
  githubAPI: Octokit,
  clusterRepository: string,
  filePath: string,
): Promise<[error: boolean, needToSetReplicas: boolean, updatedValuesContent: string]> => {

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
    return [true, false, ''];
  }

  if (getContentResponse?.status === 200) {
    const clusterConfig = Array.isArray(getContentResponse?.data) ?
      base64Decode(getContentResponse?.data[0]?.content) :
      // @ts-ignore
      base64Decode(getContentResponse?.data?.content);
    return inspectForRolloutsReplicas(clusterConfig, logger);
  }

  logger.error(`Error retrieving replicas configuration on ${clusterRepository}/${filePath}`);
  return [false, false, ''];
};

export async function argoRolloutChecksReplicas(logger: winston.Logger,
                                             octokit: Octokit,
                                             clusterRepositoryName: string,
                                             rolloutsHelmValuesFilePath: string,
                                             outputArray: [message: string][]): Promise<[message: string][]> {
  const [error, needToSetReplicas, updatedReplicasContent] = await rolloutsReplicasConfig(
    logger,
    octokit,
    clusterRepositoryName,
    rolloutsHelmValuesFilePath);

  if (!needToSetReplicas) {
    logger.info(`Rollouts replicas is already set or can't be configured on ${clusterRepositoryName}`);
    if (error)
      outputArray.push([`Argo-rollouts não encontrado no repositório de infra do cluster, favor solicitar instalação pelo canal #suporte-developer-experience`])
    return outputArray;
  }
  const newBranchName = `feat/set-rollouts-replicas-${Date.now()}`;

  // Criação de PR para ajustar replicas
  const prURL = await createSingleFilePullRequest(octokit,
    clusterRepositoryName,
    newBranchName,
    rolloutsHelmValuesFilePath,
    updatedReplicasContent,
    'Set Argo Rollouts replicas to 1');

  outputArray.push([`Habilitando Rollouts no cluster ${fixedGitHubURL(prURL)}`]);

  return outputArray;
}

