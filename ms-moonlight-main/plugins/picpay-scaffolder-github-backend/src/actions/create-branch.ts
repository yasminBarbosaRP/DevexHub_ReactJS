import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { createRefSha } from '../service/github-push-to-branch-service';
import { Octokit } from 'octokit';

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

export const createBranchAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repo: string;
    targetBranch: string;
    baseBranch?: string;
  }>({
    id: 'moonlight:create-branch',
    schema: {
      input: {
        required: ['repo', 'targetBranch'],
        type: 'object',
        properties: {
          repo: {
            type: 'string',
            title: 'repo',
            description: 'Repository where create the branch',
          },
          targetBranch: {
            type: 'string',
            title: 'targetBranch',
            description: 'Branch to be created',
          },
          baseBranch: {
            type: 'string',
            title: 'baseBranch',
            description:
              'Branch from which the new branch will be created (opcional)',
          },
        },
      },
    },
    async handler(ctx) {
      const owner = 'PicPay';
      const { repo, targetBranch, baseBranch = 'main' } = ctx.input;

      ctx.logger.info('creating github connection...');
      const octokit = await createGithubConnection(
        repo,
        integrations,
        githubCredentialsProvider,
      );

      ctx.logger.info(`repository ${repo}`);
      ctx.logger.info(`targetBranch: ${targetBranch}`);
      ctx.logger.info(`baseBranch: ${baseBranch}`);

      const refSha = await createRefSha(
        octokit,
        owner,
        repo,
        targetBranch,
        baseBranch,
      );
      ctx.logger.info(`targetBranch '${targetBranch}' SHA: ${refSha}`);
    },
  });
};
