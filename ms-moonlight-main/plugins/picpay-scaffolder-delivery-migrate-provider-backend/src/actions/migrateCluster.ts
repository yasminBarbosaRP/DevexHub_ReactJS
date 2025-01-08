// DEPRECATED: SOS MSPROD is finished
import { Octokit } from 'octokit';
import { HarnessMigration } from '../service/harness';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { CatalogApi } from '@backstage/catalog-client';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { DeployType } from '@internal/plugin-picpay-scaffolder-identify-cd-backend';
import { ArgoCDMigration } from '../service/argocd';

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

export type MigrateValidations = {
  serviceName: string;
  clusters: any;
};

export const migrateServiceFromLegacyClusterToNew = (
  integrations: ScmIntegrations,
  catalogClient: CatalogApi,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    deployType: string;
    clusters: any;
    branch?: string;
  }>({
    id: 'moonlight:migration:cloud-provider',
    schema: {
      input: {
        required: [],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'serviceName',
            description: 'The name of the repository service',
          },
          branch: {
            type: 'string',
            title: 'branch',
            description: 'The name of the branch for the pull request',
          },
          deployType: {
            type: 'string',
            title: 'deployType',
            description: 'specify kind of deploy is ArgoCD or Harness',
          },
          clusters: {
            type: 'object',
            title: 'cluster',
            description: 'Full name of the destiny cluster',
          },
        },
      },
    },
    async handler(ctx) {
      const { serviceName, deployType, clusters, branch } = ctx.input;

      const logger = ctx.logger;
      logger.info('Initializing github...');
      const githubApi: Octokit = await createGithubConnection(
        serviceName,
        integrations,
        githubCredentialsProvider,
      );
      logger.info('github initialized');
      let result: { url: string; number: number } = { url: '', number: 0 };
      switch (deployType) {
        case DeployType.ARGOCD:
          result = await new ArgoCDMigration(
            logger,
            githubApi,
            ctx.workspacePath,
            branch,
          ).execute(serviceName, clusters);
          break;
        case DeployType.HARNESS:
          result = await new HarnessMigration(
            logger,
            githubApi,
            catalogClient,
            ctx.workspacePath,
            branch,
          ).execute(serviceName, clusters);
          break;
        default:
          logger.error('Tipo de Deploy não detectado');
          break;
      }
      ctx.output('pull_request_url', result.url);
      ctx.output('pull_request_number', result.number);
    },
  });
};
