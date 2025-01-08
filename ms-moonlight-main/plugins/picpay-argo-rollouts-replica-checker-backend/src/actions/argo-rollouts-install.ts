import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { GithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import { createGithubConnection } from '../service/github-push-to-branch-service';
import { argoRolloutChecksChartVersion } from '../service/chart-version-config';
import { argoRolloutChecksValues } from '../service/values-config';
import { RolloutsConfig } from '../domain/RolloutsConfig';
import path from 'path';


function getValuesFilePath(environment: string) {
  let valuesFilePath = 'chart/values.qa.yaml';
  if (environment === 'prd')
    valuesFilePath = 'chart/values.prod.yaml';
  return valuesFilePath;
}

export const rolloutsInstall = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => createTemplateAction<{
  repository: string;
  environment: string;
  duration: string;
  weights: string;
  type: string;
  interval: string;
  analysisUrl: string;
  analysisSuccessCondition: string;
  timeout: string
}>({
  id: 'moonlight:argo-rollouts-ms-config',
  schema: {
    input: {
      required: ['repository', 'environment'],
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          title: 'Repository',
          description: 'The app repository to add Argo Rollouts.',
        },
        environment: {
          type: 'string',
          title: 'Environment',
          description: 'The app environment to add Rollouts configuration.',
          default: 'hom'
        },
        duration: {
          type: 'string',
          title: 'Duration',
          default: '10m'
        },
        weights: {
          type: 'string',
          title: 'Weights',
          default: '1/20/30/50/100'
        },
        type: {
          type: 'string',
          title: 'Type',
          default: 'web'
        },
        interval: {
          type: 'string',
          title: 'Interval',
          default: '10s'
        },
        analysisUrl: {
          type: 'string',
          title: 'Analysis URL',
          default: 'http://{{args.canary-service}}:80/health'
        },
        analysisSuccessCondition: {
          type: 'string',
          title: 'Analysis Success Condition',
          default: 'result == true'
        },
        timeout: {
          type: 'string',
          title: 'Timeout',
          default: '30s'
        }
      },
    },
    output: {
      type: 'object',
      properties: {
        status: {
          type: 'string|object',
          title: 'outputData',
          description: 'Pull requests URL to enable microservice Rollouts strategy.',
        },
      },
    },
  },
  async handler(ctx) {
    const { repository,
      environment,
      duration,
      weights,
      type,
      interval,
      analysisUrl,
      analysisSuccessCondition,
      timeout
    } = ctx.input;

    const rolloutsConfig = new RolloutsConfig(duration, weights, type, interval, analysisUrl, analysisSuccessCondition, timeout);

    const infraRepositoryName = `${repository}-infra`;
    const helmChartFilePath = path.join('chart', 'Chart.yaml');
    const valuesFilePath = getValuesFilePath(environment);

    let outputArray: [message: string][] = [];

    const octokit = await createGithubConnection(integrations, githubCredentialsProvider);
    ctx.logger.info('GitHub connection established.');

    // Application infra repository
    // Verifica versão do chart picpay msv2 >= 2.4
    let needToChamgeQAChartName = false;
    [needToChamgeQAChartName, outputArray] = await argoRolloutChecksChartVersion(ctx.logger,
      octokit,
      environment,
      infraRepositoryName,
      helmChartFilePath,
      outputArray);

    // Atualiza o arquivo de values.qa.yaml para adicionar o canary
    outputArray = await argoRolloutChecksValues(ctx.logger,
      octokit,
      rolloutsConfig,
      needToChamgeQAChartName,
      infraRepositoryName,
      valuesFilePath,
      outputArray);

    if (outputArray.length === 0)
      outputArray.push([`Aplicação já possui o Rollouts configurado!`]);

    ctx.output('outputData', `${outputArray}`);
  },
});
