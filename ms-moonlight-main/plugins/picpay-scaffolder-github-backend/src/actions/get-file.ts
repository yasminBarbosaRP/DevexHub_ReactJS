import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';

export const getFileAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repository: string;
    filepath: string;
    throwOnError: boolean;
  }>({
    id: 'moonlight:get-files',
    schema: {
      input: {
        required: ['repository', 'filepath'],
        type: 'object',
        properties: {
          repository: {
            type: 'string',
            title: 'repository',
            description: 'Repository name',
          },
          filepath: {
            type: 'string',
            title: 'filepath',
            description: 'File path to be retrieved',
          },
          throwOnError: {
            type: 'boolean',
            title: 'throwOnError',
            description: 'Throw error if file is not found',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          data: {
            type: 'string',
            title: 'data',
            description: 'File content',
          },
          status_code: {
            type: 'number',
            title: 'status_code',
            description: 'HTTP status code',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        repository,
        filepath,
        throwOnError
      } = ctx.input;

      const repositoryURL = `https://github.com/PicPay/${repository}`;
      const credentialProviderToken = await githubCredentialsProvider?.getCredentials({ url: repositoryURL });

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
      try {
        const { data, status } = await octokit.rest.repos.getContent({
          owner: 'PicPay',
          repo: repository,
          path: filepath,
        });
        ctx.logger.debug(`Fetched file ${filepath} from ${repository}, status: ${status}`);
        // @ts-ignore
        const content = Buffer.from(data.content, 'base64').toString();
        ctx.logger.debug(`File content: ${content}`);
        
        if (status > 299) {
          throw new Error(`Error while fetching file ${filepath}, status: ${status}`);
        }

        ctx.output('data', content);
        ctx.output('status_code', status);
      } catch (err: any) {
        if (throwOnError) {
          throw err;
        }
      }
    },
  });
};
