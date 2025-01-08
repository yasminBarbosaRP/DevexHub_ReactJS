import { Octokit } from 'octokit';
import { GithubRepository } from '../repository/github';
import { ClusterDiscovery } from '../service/clusterDiscovery';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

const GITHUB_BASE_URL = `https://api.github.com`;

const normalizeServiceName = (serviceName: string): string => {
  return serviceName.replace('picpay-dev-', '');
};

export const harnessClusterIdentidy = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
  }>({
    id: 'moonlight:harness-cluster-identity',
    schema: {
      input: {
        required: ['serviceName'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'ServiceName',
            description: 'The name of the service',
          },
        },
      },
      output: {
        properties: {
          harnessClusterHom: {
            type: 'string',
            title: 'harnessClusterHom',
            description: 'The value of homolog cluster identified on Harness',
          },
          harnessClusterPrd: {
            type: 'string',
            title: 'harnessClusterPrd',
            description:
              'The value of production cluster identified on Harness',
          },
          harnessClusterIdentidy: {
            type: 'object',
            title: 'harnessClusterIdentity',
            description: 'The object of harness cluster by environment',
          },
        },
      },
    },
    async handler(ctx) {
      const { logger } = ctx;
      const { serviceName } = ctx.input;
      const repoURL = `https://github.com/PicPay/${serviceName}`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });
      const githubApi = new Octokit({
        ...integrations,
        baseUrl: GITHUB_BASE_URL,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      logger.info('initializing components...');
      const githubRepository = new GithubRepository(githubApi);
      const clusterDiscovery = new ClusterDiscovery(githubRepository);

      logger.info("retrieving harness's clusters by environment");
      const clusters = await clusterDiscovery.getClusterByEnvironment(
        normalizeServiceName(serviceName),
      );

      const clusterIdentity = clusterDiscovery.discover(clusters);
      logger.info(JSON.stringify(clusterIdentity, null, 4));
      ctx.output('harnessClusterIdentity', clusterIdentity);
      ctx.output('harnessClusterHom', clusterIdentity.hom);
      ctx.output('harnessClusterPrd', clusterIdentity.prd);
    },
  });
};
