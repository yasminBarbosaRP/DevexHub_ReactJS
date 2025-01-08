import yaml from 'js-yaml';
import { Octokit } from 'octokit';
import { base64Decode, fixedGitHubURL } from '../helpers/helpers';
import * as winston from 'winston';
import { createSingleFilePullRequest } from './github-push-to-branch-service';

const targetDependencyVersion = '2.7.2';
const minDependencyVersion = '2.4.0';
const picpayDependencyName = 'picpay-ms-v2';
const chartMuseumURL = 'https://chartmuseum.ppay.me';


// Function to add the QA dependency
function addQADependency(data: any): any {
  // Create the new dependency to add
  const newDependency = {
    name: `${picpayDependencyName}-qa`,
    version: targetDependencyVersion,
    repository: chartMuseumURL,
  };
  // Add the new dependency to the existing dependencies list
  if (data && data.dependencies) {
    data.dependencies.push(newDependency);
  }
  // Convert the modified JavaScript object back to YAML
  return yaml.dump(data);
}

// Function to compare two version strings
export function versionIsGreaterThan(currentVersion: string, requiredVersion: string): boolean {
  const currentParts = currentVersion.split('.').map(Number);
  const requiredParts = requiredVersion.split('.').map(Number);

  for (let i = 0; i < 3; i++) {
    const current = currentParts[i] || 0;
    const required = requiredParts[i] || 0;

    if (current > required) return true;
    if (current < required) return false;
  }
  return true;
}

// Function to check if a specific dependency exists
export function isDependencyExists(chartData: any, _dependencyName: string): boolean {

  const dependencies = chartData?.dependencies;
  if (!Array.isArray(dependencies)) {

    return false;
  }
  return dependencies.some((dep: any) => dep.name === _dependencyName);
}

// Function to update the dependency version
function updateDependencyVersion(parsedYaml: any, _dependencyName: string, logger: winston.Logger): string {
  parsedYaml.dependencies.forEach((dep: any) => {
    if (dep.name === _dependencyName) {
      dep.version = targetDependencyVersion;
    }
  });
  logger.info(`Updated ${_dependencyName} dependency version to ${targetDependencyVersion}.`);
  return yaml.dump(parsedYaml);
}

// Function to check if the dependency version is greater than or equal to the required version
function isDependencyVersionAboveOrEqual(chartData: any, _dependencyName: string, requiredVersion: string): boolean {
  const dependency = chartData.dependencies.find((dep: any) => dep.name === _dependencyName);
  return versionIsGreaterThan(dependency.version, requiredVersion);
}

// Check and update a specific dependency
function checkAndUpdateDependency(parsedYaml: any,
                                  logger: winston.Logger,
                                  dependencyName: string,
): [updated: boolean, updatedData: string] {

  if (isDependencyExists(parsedYaml, dependencyName)) {
    const isUpdated = isDependencyVersionAboveOrEqual(parsedYaml, dependencyName, minDependencyVersion);
    if (!isUpdated) {
      return [true, updateDependencyVersion(parsedYaml, dependencyName, logger)];
    }
  }

  return [false, parsedYaml];
}

// Main function to inspect and update the chart version
export function inspectForChartVersion(
  chartConfig: any,
  logger: winston.Logger,
  environment: string,
): [needToChamgeQAChartName: boolean, needToSetChartVersion: boolean, updatedChartContent: string] {

  let parsedYaml: any = yaml.load(chartConfig);
  let mainUpdate = false;

  if (!parsedYaml)
    return [false, false, chartConfig];

  const qaDependencyName = `${picpayDependencyName}-qa`;

  if (environment === 'hom') {
    // Check for QA dependency is already exists
    let qaUpdate = false;
    [qaUpdate, parsedYaml] = checkAndUpdateDependency(parsedYaml, logger, qaDependencyName);
    if (qaUpdate)
      return [false, false, parsedYaml];

    // If QA doesn't exist, add it
    const exists = isDependencyExists(parsedYaml, qaDependencyName);
    if (!exists) {
      return [true, true, addQADependency(parsedYaml)];
    }
  } else {
    // For other environments, check only the main dependency
    [mainUpdate, parsedYaml] = checkAndUpdateDependency(parsedYaml, logger, picpayDependencyName);
    if (mainUpdate)
      return [false, true, parsedYaml];
  }

  logger.info(`No need to update ${picpayDependencyName} dependency version.`);
  return [false, false, chartConfig];
}

// Helper function to get the chart version config from GitHub
const chartVersionConfig = async (
  logger: winston.Logger,
  githubAPI: Octokit,
  environment: string,
  infraRepositoryName: string,
  helmChartFilePath: string,
): Promise<[needToChamgeQAChartName: boolean, needToSetChartVersion: boolean, updatedChartContent: string]> => {
  try {
    const getContentResponse = await githubAPI.rest.repos.getContent({
      owner: 'PicPay',
      repo: infraRepositoryName,
      path: helmChartFilePath,
      branch: 'main',
    });

    if (getContentResponse?.status === 200) {
      const clusterConfig = base64Decode(
        // @ts-ignore
        Array.isArray(getContentResponse.data) ? getContentResponse.data[0].content : getContentResponse.data?.content,
      );
      return inspectForChartVersion(clusterConfig, logger, environment);
    }
  } catch (error) {
    logger.error(`Error retrieving chart configuration from ${infraRepositoryName}/${helmChartFilePath}`);
  }

  return [false, false, ''];
};

// Main function to handle Argo rollout chart version checks
export async function argoRolloutChecksChartVersion(
  logger: winston.Logger,
  octokit: Octokit,
  environment: string,
  infraRepositoryName: string,
  helmChartFilePath: string,
  outputArray: [message: string][],
): Promise<[needToChangeQAChartName: boolean, [message: string][]]> {
  const [needToChangeQAChartName, needToSetChartVersion, updatedChartContent] = await chartVersionConfig(
    logger, octokit, environment, infraRepositoryName, helmChartFilePath,
  );

  if (!needToSetChartVersion) {
    logger.info(`${picpayDependencyName} version already >= ${minDependencyVersion} or can't be configured on ${infraRepositoryName}`);
    return [false, outputArray];
  }

  const newBranchName = `feat/update-chart-version-${Date.now()}`;
  const prURL = await createSingleFilePullRequest(
    octokit,
    infraRepositoryName,
    newBranchName,
    helmChartFilePath,
    updatedChartContent,
    `Update chart ${picpayDependencyName} to latest version`,
  );

  outputArray.push([`Atualização do Chart ${fixedGitHubURL(prURL)}`]);
  return [needToChangeQAChartName, outputArray];
}
