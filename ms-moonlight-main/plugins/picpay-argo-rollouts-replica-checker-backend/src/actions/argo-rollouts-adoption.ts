import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { GithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import { createGithubConnection } from '../service/github-push-to-branch-service';
import { argoRolloutChecksAddon } from '../service/addons-application-config';
import { argoRolloutChecksNodepool } from '../service/nodepool-cluster-config';
import { argoRolloutChecksReplicas } from '../service/rollouts-replicas-config';
import path from 'path';


const getClusterRepositoryName = (clusterName: string,
) => {
  // FROM eks-devexp-use1-hom TO stack-terraform-eks-devexp-ck-hom
  const adjustedClusterServer = clusterName.replace('use1', 'ck');
  return `stack-terraform-${adjustedClusterServer}`;
};

const detectClusterEnvironment = (cluster: string,
): 'hom' | 'prd' | 'unknown' => {
  if (cluster?.includes('-hom')) {
    return 'hom';
  }
  if (cluster?.includes('-prd')) {
    return 'prd';
  }
  return 'unknown';
};


export const argoRolloutAdoption = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => createTemplateAction<{
  cluster: string;
}>({
  id: 'moonlight:argo-rollouts-cluster-config',
  schema: {
    input: {
      required: ['cluster'],
      type: 'object',
      properties: {
        cluster: {
          type: 'string',
          title: 'Cluster',
          description: 'The cluster to check the Argo Rollouts configuration.',
        },
      },
    },
    output: {
      type: 'object',
      properties: {
        status: {
          type: 'string|object',
          title: 'outputData',
          description: 'Pull requests URL to enable Argo Rollouts.',
        },
      },
    },
  },
  async handler(ctx) {
    const { cluster } = ctx.input;

    const environment = detectClusterEnvironment(cluster);
    const addonsRepoName = 'addons-aplication-config';
    const addonClusterConfigPath = path.join('app-infra', environment, `${cluster}.yaml`);
    const karpenterValuesFilePath = path.join('apps', 'karpenter', 'values.yaml');
    const rolloutsHelmValuesFilePath = path.join('apps', 'argo-rollouts', 'values.yaml');
    const clusterRepositoryName = getClusterRepositoryName(cluster);

    let outputArray: [message: string][] = [];

    const octokit = await createGithubConnection(integrations, githubCredentialsProvider);
    ctx.logger.info('GitHub connection established.');

    // CK Addons repository Application Config
    // Verificação do addon Rollouts habilitado no cluster
    outputArray = await argoRolloutChecksAddon(ctx.logger,
      octokit,
      addonsRepoName,
      addonClusterConfigPath,
      outputArray);

    // App cluster repository
    // Verifica o Nodepool do argo-rollouts no values do karpenter
    outputArray = await argoRolloutChecksNodepool(ctx.logger,
      octokit,
      clusterRepositoryName,
      karpenterValuesFilePath,
      outputArray);

    // Lógica de verificação de replicas
    outputArray = await argoRolloutChecksReplicas(ctx.logger,
      octokit,
      clusterRepositoryName,
      rolloutsHelmValuesFilePath,
      outputArray);

    if (outputArray.length === 0)
      outputArray.push([`Rollouts já está configurado no ambiente!`]);

    ctx.output('outputData', outputArray);
  },
});
