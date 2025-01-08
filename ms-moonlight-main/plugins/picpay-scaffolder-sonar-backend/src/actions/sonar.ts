import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { SonarHelper } from '../service/sonar-service';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { GithubHelper } from '../service/github-service';

export const createSonarProjectAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repo: string;
    bu: string;
    squad: string;
  }>({
    id: 'moonlight:sonar',
    schema: {
      input: {
        required: ['repo', 'bu', 'squad'],
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            title: 'repo',
            description: 'Repository name',
          },
          bu: {
            type: 'string',
            title: 'bu',
            description: 'Bu owner',
          },
          squad: {
            type: 'string',
            title: 'squad',
            description: 'Squad owner',
          },
        },
      },
    },
    async handler(ctx) {
      const { repo, bu, squad } = ctx.input;
      const github = new GithubHelper(
        ctx.logger,
        integrations,
        githubCredentialsProvider,
      );
      const sonar = new SonarHelper(ctx.logger, github);

      ctx.logger.info(`Creating Sonar project with the name of ${repo}`);
      await sonar.setOrganizationDefault(repo);
      ctx.logger.info(`Organization successfully set up`);
      await sonar.setQualityGateDefault(repo);
      ctx.logger.info(
        'Project successfully created with Quality Gate "Picpay QG Range 80"',
      );
      await sonar.setOwnerProject(repo, bu.toLowerCase(), squad.toLowerCase());
      ctx.logger.info(`Project owners successfully added`);
    },
  });
};
