import yaml from 'js-yaml';
import { Octokit } from 'octokit';
import { base64Decode, fixedGitHubURL } from '../helpers/helpers';
import * as winston from 'winston';
import { createSingleFilePullRequest } from './github-push-to-branch-service';

export function hasArgoRolloutsProvisioner(yamlContent: any): boolean {
  try {

    // Ensure 'karpenter-provisioners' object exists
    if (!yamlContent['karpenter-provisioners']) {
      return false;
    }
    // Check if 'argo-rollouts' exists in 'karpenter-provisioners' -> 'Provisioners'
    const provisioners = yamlContent?.['karpenter-provisioners']?.Provisioners;
    if (Array.isArray(provisioners)) {
      return provisioners.some(provisioner => provisioner.name === 'argo-rollouts');
    }

    return false;
  } catch (error) {
    return false;
  }
}

export function inspectForRolloutsNodepool(
  clusterKarpenterConfig: any,
  logger: winston.Logger,
): [needToAddRolloutsNodepool: boolean, updatedContent: string] {

  const parsedYaml: any = yaml.load(clusterKarpenterConfig);

  if (hasArgoRolloutsProvisioner(parsedYaml)) {
    logger.info('Argo Rollouts Nodepool is already present in the cluster configuration.');
  } else if (parsedYaml['karpenter-provisioners'] && parsedYaml['karpenter-provisioners'].Provisioners) {
    // Add the new dependency to the existing dependencies list
    const rolloutsProvisioner = { name: 'argo-rollouts' };
    parsedYaml['karpenter-provisioners'].Provisioners.push(rolloutsProvisioner);
    const updatedContent = yaml.dump(parsedYaml);
    return [true, updatedContent];
  }

  return [false, clusterKarpenterConfig];
}

export const nodepoolClusterConfig = async (
  logger: winston.Logger,
  githubAPI: Octokit,
  clusterRepository: string,
  filePath: string,
): Promise<[needToAddRolloutsAddon: boolean, updatedContent: string]> => {

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
    return [false, ''];
  }

  if (getContentResponse?.status === 200) {
    const clusterConfig = Array.isArray(getContentResponse?.data) ?
      base64Decode(getContentResponse?.data[0]?.content) :
      // @ts-ignore
      base64Decode(getContentResponse?.data?.content);
    return inspectForRolloutsNodepool(clusterConfig, logger);
  }

  logger.error(`Error retrieving karpenter configuration on ${clusterRepository}/${filePath}`);
  return [false, ''];
};

export async function argoRolloutChecksNodepool(logger: winston.Logger,
                                                octokit: Octokit,
                                                clusterRepositoryName: string,
                                                karpenterValuesFilePath: string,
                                                outputArray: [message: string][]): Promise<[message: string][]> {
  const [needToAddNodepool, updatedClusterContent] = await nodepoolClusterConfig(
    logger,
    octokit,
    clusterRepositoryName,
    karpenterValuesFilePath);

  if (!needToAddNodepool) {
    logger.info(`Argo Rollouts Nodepool is already added or can't be configured on ${clusterRepositoryName}`);
    return outputArray;
  }

  const newBranchName = `feat/add-rollouts-nodepool-${Date.now()}`;

  // Criação de PR para adicao do Rollouts Nodepool
  const prURL = await createSingleFilePullRequest(octokit,
    clusterRepositoryName,
    newBranchName,
    karpenterValuesFilePath,
    updatedClusterContent,
    'Add Argo Rollouts Nodepool');

  outputArray.push([`Rollouts Nodepool created ${fixedGitHubURL(prURL)}`]);

  return outputArray;
}
