import { Octokit } from 'octokit';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Bypasses } from '../models/branch-protection';

export const createGithubConnection = async (
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

export const updateBranchProtection = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repo: string;
    branch: string;
    approvers: number;
    statusChecks: string[];
    enforceAdmins: boolean;
    requireCodeOwnerReviews: boolean;
    bypasses: Bypasses;
  }>({
    id: 'moonlight:branch-protection',
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
          branch: {
            type: 'string',
            title: 'branch',
            description: 'Branch to be protected',
          },
          approvers: {
            type: 'number',
            title: 'approvers',
            description: 'Number of Required Approvers',
          },
          statusChecks: {
            type: 'array',
            title: 'statusChecks',
            description:
              'StatusChecks que serão adicionados na branch protection',
          },
          enforceAdmins: {
            type: 'boolean',
            title: 'enforceAdmins',
            description:
              'StatusChecks que serão adicionados na branch protection',
          },
          bypasses: {
            type: 'object',
            title: 'restrictions',
            description:
              'Object of users, teams or apps to bypass the branch protection',
          },
        },
      },
    },
    async handler(ctx) {
      const owner = 'PicPay';
      const {
        repo,
        branch,
        approvers = 1,
        statusChecks = [],
        enforceAdmins = true,
        requireCodeOwnerReviews = true,
        bypasses = null,
      } = ctx.input;

      ctx.logger.info('creating github connection...');
      const octokit = await createGithubConnection(
        repo,
        integrations,
        githubCredentialsProvider,
      );

      const pullRequestOptions = {
        required_approving_review_count:
          isNaN(approvers) || approvers <= 0 ? 1 : approvers,
        require_code_owner_reviews: requireCodeOwnerReviews,
      };
      if (bypasses) {
        Object.assign(pullRequestOptions, {
          bypass_pull_request_allowances: bypasses,
        });
      }

      ctx.logger.info(
        `repository ${repo}, branch ${branch} enforceAdmins: ${enforceAdmins}`,
      );
      ctx.logger.info(`approvers: ${JSON.stringify(approvers)}`);
      ctx.logger.info(`statusChecks: ${JSON.stringify(statusChecks)}`);
      ctx.logger.info(`restrictions: ${JSON.stringify(bypasses)}`);
      ctx.logger.info(`restrictions: ${JSON.stringify(pullRequestOptions)}`);
      try {
        await octokit.rest.repos.updateBranchProtection({
          mediaType: {
            previews: ['luke-cage-preview'],
          },
          owner,
          repo,
          branch,
          required_status_checks: {
            strict: true,
            contexts: statusChecks,
          },
          restrictions: null,
          enforce_admins: enforceAdmins,
          required_pull_request_reviews: pullRequestOptions,
        });
        ctx.logger.info(
          `Successfully created protection for branch ${branch} on ${repo} repository.`,
        );
      } catch (e: any) {
        ctx.logger.info(
          `Error to create protection for branch ${branch} on ${repo} repository.`,
        );
        ctx.logger.error(e);
      }

      try {
        await octokit.request(`POST /repos/PicPay/${repo}/labels`, {
          name: 'deploy-QA',
          color: '006B75',
          description: 'Deploya essa Pull Request no ambiente de QA.',
        });
      } catch (e: any) {
        if (e.response.data.errors[0].code === 'already_exists') {
          ctx.logger.info(`Label deploy-QA já existe no repositório ${repo}`);
          return;
        }
      }
      ctx.logger.info(
        `Successfully created tag deploy-QA on ${repo} repository`,
      );
    },
  });
};
