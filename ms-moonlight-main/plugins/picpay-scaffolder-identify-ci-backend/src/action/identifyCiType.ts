import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Octokit } from 'octokit';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { GithubRepository } from '@internal/plugin-picpay-scaffolder-commons-backend';
import GithubService from '../service/GithubService';
import { getPipeline } from './helper/helper';

const githubConnection = async (
  repository: string,
  integrations: ScmIntegrations,
  credentialProviderToken?: GithubCredentialsProvider,
): Promise<Octokit> => {
  const repositoryURL = `https://github.com/PicPay/${repository}`;
  const credentialProvider = await credentialProviderToken?.getCredentials({
    url: repositoryURL,
  });
  return new Octokit({
    ...integrations,
    baseUrl: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.machine-man-preview+json',
    },
    auth: credentialProvider?.token,
    previews: ['nebula-preview'],
  });
};

export const identifyCiTypeAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{ repositoryName: string }>({
    id: 'moonlight:identify-ci-type',
    schema: {
      input: {
        required: ['repositoryName'],
        properties: {
          repositoryName: {
            type: 'string',
            title: 'repository name',
            description: 'The name of service repository',
          },
        },
      },
    },
    async handler(ctx) {
      ctx.logger.info('Discovery pipeline type');
      const repositoryName = ctx.input.repositoryName;
      const owner = 'PicPay';
      const github = await githubConnection(
        repositoryName,
        integrations,
        githubCredentialsProvider,
      );
      const githubRepository = new GithubRepository(github);
      const githubService = new GithubService(
        owner,
        repositoryName,
        githubRepository,
      );
      const webhooks = await githubService.getWebhooks();
      const pipeline = getPipeline(webhooks);

      ctx.logger.info(`continuousIntegration: ${pipeline}`);
      ctx.output('continuousIntegration', pipeline);
    },
  });
};
