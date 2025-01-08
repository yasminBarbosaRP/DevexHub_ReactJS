import { Octokit } from 'octokit';
import { base64Decode } from '../helpers/helpers';
import { createGithubConnection } from '../service/github-push-to-branch-service';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { GithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import path from 'path';

const getClusterNameBy = async (octokit: Octokit, repository: string, environments: string[]): Promise<string[]> => {
  const baseRepository = 'gitops-moonlight-pipelines';
  const clusters = new Set<string>();

  console.log(`Checking clusters for ${repository} in environments: ${environments}`);
  for (const environment of environments) {
    const configPath = path.join(`apps`, `${repository}`, `${environment}`, `config.json`);
    const response = await octokit.rest.repos.getContent(
      {
        owner: 'PicPay',
        repo: baseRepository,
        path: configPath,
      });

    if (response.status !== 200) {
      console.error(`Error retrieving cluster name for ${repository} in ${environment} environment.`);
      continue;
    }

    // @ts-ignore
    const content = base64Decode(response?.data?.content, 'json');
    clusters.add(content.destination.name);
  }

  return Array.from(clusters);
};


export const clusterDiscovery = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => createTemplateAction<{
  repository: string;
  environment?: string;
}>({
  id: 'moonlight:argo-rollouts-cluster-discovery',
  schema: {
    input: {
      required: ['repository'],
      type: 'object',
      properties: {
        repository: {
          type: 'string',
          title: 'Repository',
          description: 'The repository to check the cluster for Argo Rollouts.',
        },
        environment: {
          type: 'string',
          title: 'environment',
          description: 'Environment to configure Argo Rollouts.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        clusters: {
          type: 'array',
          title: 'Clusters',
          description: 'The clusters found for the repository.',
          items: {
            type: 'string',
          },
        },
      },
    },
  },
  async handler(ctx) {

    const { repository, environment } = ctx.input;

    // TODO: Se o environment for prod verificar se já existe o rollouts configurado em QA
    const octokit = await createGithubConnection(integrations, githubCredentialsProvider);
    ctx.logger.info('GitHub connection established.');

    let environments = ['hom', 'prd'];
    if (environment)
      environments = [environment];

    const clusters = await getClusterNameBy(octokit, repository, environments);
    ctx.logger.info(`Clusters found for application ${repository}: ${clusters}`);

    ctx.output('clusters', Array.from(clusters.values()));
    if (clusters.length === 1)
      ctx.output('clusterName', clusters[0]);
  },
});
