import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { createGithubConnection } from './branch-protection';

export const picpayRepositoryVisibility = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repo: string;
    visibility: 'public' | 'restricted' | 'private';
  }>({
    id: 'moonlight:repository-visibility',
    schema: {
      input: {
        required: ['repo', 'visibility'],
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            title: 'repo',
            description: 'Repository name',
          },
          visibility: {
            type: 'string',
            title: 'picpayDevelopers',
            description: 'Manage picpay-developers team in repository',
          },
        },
      },
    },
    async handler(ctx) {
      try {
        const owner = 'PicPay';
        const { repo, visibility = 'restricted' } = ctx.input;

        ctx.logger.info('creating github connection...');
        const octokit = await createGithubConnection(
          repo,
          integrations,
          githubCredentialsProvider,
        );

        switch (visibility) {
          case 'public':
            ctx.logger.info('add/update picpay-developers permission');

            octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
              org: owner,
              owner: owner,
              repo: repo,
              team_slug: 'picpay-developers',
              permission: 'push',
            });

            break;

          case 'restricted':
            ctx.logger.info('add/update picpay-developers permission');

            octokit.rest.teams.addOrUpdateRepoPermissionsInOrg({
              org: owner,
              owner: owner,
              repo: repo,
              team_slug: 'picpay-developers',
              permission: 'pull',
            });

            break;

          case 'private':
            ctx.logger.info('remove picpay-developers permission');

            octokit.rest.teams.removeRepoInOrg({
              org: owner,
              owner: owner,
              repo: repo,
              team_slug: 'picpay-developers',
            });
            break;

          default:
        }
      } catch (err) {
        ctx.logger.error(err);
      }
    },
  });
};
