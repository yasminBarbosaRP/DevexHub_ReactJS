import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ObservabilityHelper } from '../service/observability-service';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { GithubHelper } from '../service/github-service';

export const createObservabilityProjectAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repo: string;
  }>({
    id: 'moonlight:observability',
    schema: {
      input: {
        required: ['repo'],
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            title: 'repo',
            description: 'Repository name',
          },
        },
      },
    },
    async handler(ctx) {
      const { repo } = ctx.input;

      try {
        ctx.logger.info('Creating observability', repo);

        const observability = new ObservabilityHelper(ctx.logger);
        const github = new GithubHelper(
          ctx.logger,
          integrations,
          githubCredentialsProvider,
        );

        ctx.logger.info(
          `Creating Observability project with the name of ${repo}`,
        );

        const { language, telemetry } = await github.getBasicTelemetryInfo(
          repo,
        );
        await observability.createApp(
          repo,
          language,
          telemetry.app,
          telemetry.strategy,
        );

        ctx.logger.info('Observability project was successfully created');
      } catch (err) {
        ctx.logger.error(JSON.stringify(err, Object.getOwnPropertyNames(err)));
      }
    },
  });
};
