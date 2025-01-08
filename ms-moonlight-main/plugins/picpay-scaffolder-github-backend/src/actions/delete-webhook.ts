import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { deleteWebhookByURL } from '../service/github-webhook';

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

export const deleteWebhookAction= (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repository: string;
    webhookUrl: string;
  }>({
    id: 'moonlight:delete-webhook',
    schema: {
      input: {
        required: ['repository', 'webhookUrl'],
        type: 'object',
        properties: {
          repository: {
            type: 'string',
            title: 'repository',
            description: 'The repository where the webhook is going to be deleted',
          },
          webhookUrl: {
            type: 'string',
            title: 'webhookUrl',
            description: 'The URL of the webhook to be deleted',
          },
        },
      },
    },
    async handler(ctx) {
      const { repository, webhookUrl } = ctx.input;
      const octokit = await createGithubConnection(
        repository,
        integrations,
        githubCredentialsProvider,
      );
      ctx.logger.info('github connection created');

      await deleteWebhookByURL(ctx.logger, octokit, repository, webhookUrl);
      ctx.logger.info(`webhook ${webhookUrl} from ${repository} was deleted`);
    },
  });
};
