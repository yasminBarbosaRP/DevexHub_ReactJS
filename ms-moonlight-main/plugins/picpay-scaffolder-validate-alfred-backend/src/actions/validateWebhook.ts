import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { GithubRepository } from '@internal/plugin-picpay-scaffolder-commons-backend';
import { validateWebhook } from './helper/helper';
import { NotFoundError } from '@backstage/errors';
import { githubConnection } from '../service/githubConnection';

export const validateWebhookAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repository: string;
    webhook: string[];
    throwError?: boolean;
  }>({
    id: 'moonlight:alfred-validate-webhook',
    schema: {
      input: {
        required: ['repository', 'webhook'],
        properties: {
          repository: {
            type: 'string',
            title: 'Repository name',
            description: 'Name of the infra repository',
          },
          webhook: {
            type: 'array',
            title: 'Webhook Link',
            description: 'Webhook link',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
          throwError: {
            type: 'boolean',
            title: 'Throw Error',
            description: 'Throw error on execution',
          },
        },
      },
    },
    async handler(ctx) {
      ctx.logger.info('Validate Alfred Webhook');
      const { repository, webhook, throwError } = ctx.input;
      const owner = 'PicPay';
      const github = await githubConnection(
        repository,
        integrations,
        githubCredentialsProvider,
      );
      const githubRepository = new GithubRepository(github);
      const settings = await githubRepository.getSettings(owner, repository);
      const hasAlfredWebhook = await validateWebhook(webhook, settings);

      if (throwError && !hasAlfredWebhook) {
        throw new NotFoundError(`Alfred webhook is not configured`);
      }

      ctx.logger.info(
        `Alfred webhook is configured in the repository: ${hasAlfredWebhook}`,
      );
    },
  });
};
