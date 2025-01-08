import yaml from 'js-yaml';
import { Octokit } from 'octokit';
import { base64Decode, fixedGitHubURL } from '../helpers/helpers';
import * as winston from 'winston';
import { createSingleFilePullRequest } from './github-push-to-branch-service';

function hasArgoRolloutsAddonEnabled(data: any): boolean {
  // Check if addons and argoRollouts exist and argoRollouts.enabled is true
  return data?.addons?.argoRollouts?.enabled === true;
}

function inspectForRolloutsAddon(
  clusterAddonConfig: any,
  logger: winston.Logger,
): [needToAddRolloutsAddon: boolean, updatedContent: string] {

  const contentAsYaml = yaml.load(clusterAddonConfig) as { spec: { source: { helm: { values: string } } } };
  const insideContentAsYaml = yaml.load(contentAsYaml.spec.source.helm.values) as {
    addons?: { argoRollouts?: { enabled: boolean } }
  };

  if (!insideContentAsYaml?.addons) {
    insideContentAsYaml.addons = {};
  }

  if (hasArgoRolloutsAddonEnabled(insideContentAsYaml)) {
    logger.info('Argo Rollouts is already enabled on cluster!');
    return [false, clusterAddonConfig];
  }

  // Ensure argoRollouts is added and enabled
  if (!insideContentAsYaml.addons.argoRollouts || !insideContentAsYaml.addons.argoRollouts.enabled) {
    insideContentAsYaml.addons.argoRollouts = { enabled: true };

    // Update the helm values only when we modify argoRollouts
    contentAsYaml.spec.source.helm.values = yaml.dump(insideContentAsYaml);
  }

  const updatedContent = yaml.dump(contentAsYaml);
  logger.debug(`${updatedContent}`);
  return [true, updatedContent];
}

export const configureAddonsApplicationConfig = async (
  logger: winston.Logger,
  githubAPI: Octokit,
  repo: string,
  filePath: string,
): Promise<[needToAddRolloutsAddon: boolean, updatedContent: string]> => {

  let getContentResponse;
  try {
    getContentResponse = await githubAPI.rest.repos.getContent({
      owner: 'PicPay',
      repo: repo,
      path: filePath,
      ref: 'main',
    });
  } catch (error) {
    logger.error('Error fetching file content:', error.response?.data);
  }

  if (getContentResponse?.status === 200) {
    const clusterAddonConfig = Array.isArray(getContentResponse?.data) ?
      base64Decode(getContentResponse?.data[0]?.content) :
      // @ts-ignore
      base64Decode(getContentResponse?.data?.content);
    return inspectForRolloutsAddon(clusterAddonConfig, logger);
  }
  logger.error(`Error retrieving Argo Rollouts configuration on ${repo}/${filePath}`);
  return [false, ''];
};

export async function argoRolloutChecksAddon(logger: winston.Logger,
                                             octokit: Octokit,
                                             addonsRepoName: string,
                                             addonClusterConfigPath: string,
                                             outputArray: [message: string][]): Promise<[message: string][]> {
  const [needToAddRolloutsAddon, addonsUpdatedContent] = await configureAddonsApplicationConfig(
    logger,
    octokit,
    addonsRepoName,
    addonClusterConfigPath);

  if (!needToAddRolloutsAddon) {
    logger.info(`Argo Rollouts Addon is already enabled or can't be configured on ${addonClusterConfigPath}`);
    return outputArray;
  }

  const newBranchName = `feat/enable-argo-rollouts-${Date.now()}`;

  // Criação de PR para adicao do addon Rollouts
  const prURL = await createSingleFilePullRequest(octokit,
    addonsRepoName,
    newBranchName,
    addonClusterConfigPath,
    addonsUpdatedContent,
    'Add Argo Rollouts addon');

  outputArray.push([`Argo Rollouts Addon ${fixedGitHubURL(prURL)}`]);

  return outputArray;
}
