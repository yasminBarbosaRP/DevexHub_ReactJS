import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import GithubUseCase from '../service/github';
import { DockerUseCase } from '../service/docker';
import fs from 'fs-extra';
import path from 'path';

export const dockerEntrypointAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repository: string;
  }>({
    id: 'moonlight:migration:docker-entrypoint',
    schema: {
      input: {
        required: ['repository'],
        properties: {
          repository: {
            type: 'string',
            title: 'Github Repository',
            description: 'The Repository of the Component',
          },
        },
      },
    },
    async handler(ctx) {
      const { repository } = ctx.input;
      const baseURL = `https://api.github.com`;
      const fullRepo = `https://github.com/PicPay/${repository}`;

      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: fullRepo });

      const octokit = new Octokit({
        ...integrations,
        baseUrl: baseURL,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      const githubService = new GithubUseCase(ctx.logger, octokit);
      const dockerService = new DockerUseCase(ctx.logger, githubService);
      const defaultBranchName = await githubService.getDefaultBranch(
        repository,
        'PicPay',
      );
      const targetBranch = 'feat/moonlight-cluster-migration';

      try {
        const repoTree = await githubService.getTree(
          repository,
          'PicPay',
          defaultBranchName,
        );
        const dockerEntrypoint = githubService.getFileTree(
          'docker-entrypoint.sh',
          repoTree.tree,
        );
        const dockerFile = githubService.getFileTree(
          'Dockerfile',
          repoTree.tree,
        );

        const [dockerFileFormat, dockerEntrypointFormat] = await Promise.all([
          dockerService.ensureDockerFileFormat(dockerFile, repository),
          dockerService.ensureDockerEntrypointFormat(
            dockerEntrypoint,
            repository,
          ),
        ]);

        if (
          dockerFileFormat.conditionsMet &&
          dockerEntrypointFormat.conditionsMet
        ) {
          ctx.logger.info(
            `All conditions for Dockerfile and docker-entrypoint.sh in this project already met`,
          );
          return;
        }

        const tmpFolder = await ctx.createTemporaryDirectory();
        const filesToUpdate = [
          `Dockerfile`,
          // `docker-entrypoint.sh`
        ];

        fs.writeFileSync(
          path.join(tmpFolder, 'Dockerfile'),
          dockerFileFormat.result,
          { encoding: 'utf-8' },
        );
        // fs.writeFileSync(path.join(tmpFolder, "docker-entrypoint.sh"), dockerEntrypointFormat.result, { encoding: 'utf-8' });

        if (!dockerFileFormat.conditionsMet) {
          filesToUpdate.push(`Dockerfile.dev`);
          fs.writeFileSync(
            path.join(tmpFolder, 'Dockerfile.dev'),
            dockerFileFormat.originalValue,
            { encoding: 'utf-8' },
          );
        }

        await githubService.pushFilesToBranch(
          'PicPay',
          repository,
          targetBranch,
          defaultBranchName,
          tmpFolder,
          filesToUpdate,
          'Fix Dockerfile cluster migration',
        );

        const result = await githubService.createPullRequest(
          'PicPay',
          repository,
          'Cluster Migration Docker fix',
          'This PullRequest fixes the Dockerfile to make it possible deployments in the new cluster',
          targetBranch,
          defaultBranchName,
        );

        ctx.output('pull_request_url', result.url);
        ctx.output('pull_request_number', result.number);

        ctx.logger.info(
          `Docker fixed successfully, a Pull Request #${result.number} was opened on the destination repository ${repository} at ${result.url}`,
        );
      } catch (err: any) {
        const message: string = err.message;

        if (message.includes('pull request already exists')) {
          const result = await githubService.getPullRequest(
            'PicPay',
            repository,
            targetBranch,
            defaultBranchName,
          );

          ctx.output('pull_request_url', result.url);
          ctx.output('pull_request_number', result.number);
          ctx.logger.warn(
            `Docker was already fixed before, Pull Request #${result.number} was opened on the destination repository ${repository} at ${result.url}`,
          );

          return;
        }

        throw err;
      }
    },
  });
};
