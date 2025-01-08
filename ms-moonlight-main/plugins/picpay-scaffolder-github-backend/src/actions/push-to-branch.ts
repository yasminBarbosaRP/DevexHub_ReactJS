import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import {
  pushFilesToBranch,
  createPullRequest,
} from '../service/github-push-to-branch-service';
import { Octokit } from 'octokit';
import { InputError } from '@backstage/errors';

const COMMAND_TYPE = 'argocd';

export const pushToBranchAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
  pushFilesToBranchFn: (
    octo: Octokit,
    org: string,
    repo: string,
    targetBranch: string,
    baseBranch: string,
    cwd: string,
    files: string[],
    commitMessage: string,
    force?: boolean | undefined,
  ) => Promise<void> = pushFilesToBranch,
  createPullRequestFn: (
    octo: Octokit,
    owner: string,
    repo: string,
    title: string,
    body: string,
    targetBranch: string,
    baseBranch: string,
  ) => Promise<{ url: string; number: number }> = createPullRequest,
) => {
  return createTemplateAction<{
    cwd: string;
    paths: string[];
    repo: string;
    targetBranch: string;
    baseBranch?: string;
    commitMsg: string;
    pullRequest?: {
      title: string;
      description: string;
    };
  }>({
    id: 'moonlight:push-to-branch',
    schema: {
      input: {
        required: ['repo'],
        type: 'object',
        properties: {
          cwd: {
            type: 'string',
            title: 'cwd',
            description: 'Raiz de onde estão os arquivos',
          },
          paths: {
            type: 'array',
            title: 'paths',
            description: 'Caminhos à serem adicionados no commit.',
          },
          repo: {
            type: 'string',
            title: 'repo',
            description: 'Repositório para mandar o commit',
          },
          targetBranch: {
            type: 'string',
            title: 'targetBranch',
            description: 'Branch para fazer push do commit',
          },
          baseBranch: {
            type: 'string',
            title: 'baseBranch',
            description: 'Branch base para ser criado a nova branch (opcional)',
          },
          commitMsg: {
            type: 'string',
            title: 'commitMsg',
            description: 'Mensagem do commit',
          },
          pullRequest: {
            type: 'object',
            title: 'pullRequest',
            description: 'Criar uma pull request?',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        cwd,
        paths,
        repo,
        baseBranch,
        targetBranch,
        commitMsg,
        pullRequest,
      } = ctx.input;

      // pause between step executions
      ctx.logger.info(`Waiting 10 seconds before continuing...`);
      await new Promise(resolve => setTimeout(resolve, 10000));

      if (pullRequest && baseBranch === targetBranch)
        throw new InputError(
          'baseBranch cannot be the same as targetBranch while creating a Pull Request',
        );

      const helmChartUrl = `https://github.com/PicPay/helm-charts`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({
          url: helmChartUrl,
        });

      const baseUrl = `https://api.github.com`;
      const octokit = new Octokit({
        ...integrations,
        baseUrl: baseUrl,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      ctx.logger.info(`targetBranch: ${targetBranch}`);
      ctx.logger.info(`baseBranch: ${baseBranch}`);

      await pushFilesToBranchFn(
        octokit,
        'PicPay',
        repo,
        targetBranch,
        baseBranch || 'master',
        `${ctx.workspacePath}/${cwd}`,
        paths,
        commitMsg,
        cwd === COMMAND_TYPE,
      );

      if (pullRequest) {
        const { url, number } = await createPullRequestFn(
          octokit,
          'PicPay',
          repo,
          pullRequest.title,
          pullRequest.description,
          targetBranch,
          baseBranch || 'master',
        );

        ctx.output('pull_request_number', number);
        ctx.output('pull_request_url', url);
      }
    },
  });
};
