import { Octokit } from 'octokit';
import { OpsHarnessOptions } from '../interfaces/OpsHarness';
import { GitDirectoryRepository } from '../repository/GitDirectoryRepository';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

const createGithubConnection = async (
  repository: string,
  integrations: ScmIntegrations,
  credentialProviderToken?: GithubCredentialsProvider,
): Promise<Octokit> => {
  const repositoryURL = `https://github.com/PicPay/${repository}`;
  const credentials = await credentialProviderToken?.getCredentials({
    url: repositoryURL,
  });
  return new Octokit({
    ...integrations,
    baseUrl: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.machine-man-preview+json',
    },
    auth: credentials?.token,
  });
};

export const gitChangeDirectoryAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repositoryName: string;
    serviceName: string;
    sourcePath: string;
    destPath: string;
    baseBranch: string;
    targetBranch: string;
  }>({
    id: 'moonlight:change-directory',
    schema: {
      input: {
        required: ['repositoryName', 'serviceName', 'sourcePath', 'destPath'],
        type: 'object',
        properties: {
          repositoryName: {
            type: 'string',
            title: 'repositoryName',
            description: "the repository's name",
          },
          serviceName: {
            type: 'string',
            title: 'serviceName',
            description: 'the name of a service to change',
          },
          sourcePath: {
            type: 'string',
            title: 'sourcePath',
            description: 'the origin of the service to be change',
          },
          destPath: {
            type: 'string',
            title: 'destPath',
            description: 'the dest path of a service will be moved',
          },
          baseBranch: {
            type: 'string',
            title: 'baseBranch',
            description: 'the base branch to get changes',
          },
          targetBranch: {
            type: 'string',
            title: 'targetBranch',
            description: 'the target branch to send the changes',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        repositoryName,
        serviceName,
        sourcePath,
        destPath,
        baseBranch,
        targetBranch,
      } = ctx.input;

      ctx.logger.info('Initializing githubAPI...');
      const githubAPI = await createGithubConnection(
        repositoryName,
        integrations,
        githubCredentialsProvider,
      );
      const options: OpsHarnessOptions = { context: ctx, githubAPI: githubAPI };
      const gitopsHarness = new GitDirectoryRepository(options);

      ctx.logger.info(`disabling microservice ${serviceName}...`);
      await gitopsHarness.moveFilesFromDirectory(
        serviceName,
        repositoryName,
        baseBranch,
        targetBranch,
        sourcePath,
        destPath,
      );
      ctx.logger.info(`the service ${serviceName} was disabled`);
      ctx.logger.info('the harness will sync the project automatically');
    },
  });
};
