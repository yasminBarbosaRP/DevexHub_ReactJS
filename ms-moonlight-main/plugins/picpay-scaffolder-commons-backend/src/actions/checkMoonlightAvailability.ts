import { Octokit } from 'octokit';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { GithubRepository } from '../repositories/github';
import { GithubRepositoryService } from '../services/repositoryDetails';
import {
  isThereCatalogInfo,
  isThereMoonlightYAML,
  isThereSonarProperties,
  isThereMoonlightWebhookConfigured,
  isHelmchartsVersionAvailable,
} from './policies';

const OWNER = 'PicPay';
const BASE_URL = `https://api.github.com`;

export const checkAlreadyIsOnMoonlight = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{ repositoryName: string }>({
    id: 'moonlight:check-requirements',
    schema: {
      input: {
        required: ['repositoryName'],
        properties: {
          repositoryName: {
            type: 'string',
            title: 'repository name',
            description: 'The name of service repository',
          },
        },
      },
    },
    async handler(ctx) {
      const components: any = {};
      const repositoryName = ctx.input.repositoryName;
      const repoURL = `https://github.com/PicPay/${repositoryName}`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });

      const octokit = new Octokit({
        ...integrations,
        baseUrl: BASE_URL,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });
      const githubRepository = new GithubRepository(octokit);
      const githubService = new GithubRepositoryService(githubRepository);
      const repositoryDetails = await githubService.getRepositoryDetails(
        OWNER,
        repositoryName,
      );

      components.logger = ctx.logger;
      components.githubService = githubService;

      const syncPolicies = [
        isThereCatalogInfo,
        isThereMoonlightYAML,
        isThereSonarProperties,
        isThereMoonlightWebhookConfigured,
      ];

      for (const policy of syncPolicies) {
        try {
          policy(components, repositoryDetails);
        } catch (e) {
          ctx.logger.error(`something was wrong!: ${e}`);
          throw e;
        }
      }
      await isHelmchartsVersionAvailable(components, repositoryName);
    },
  });
};
