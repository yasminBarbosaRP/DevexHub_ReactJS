import fs from 'fs';
import { Octokit } from 'octokit';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { MergeContentService } from '../service/mergeContent';
import { ContentsRepository } from '../repository/contents';
import { MergeContentRequestModel } from '../models/request';
import { pushFilesToBranch } from '../service/github-push-to-branch';
import { resolveSafeChildPath } from '@backstage/backend-common';

const transformToObject = (content: string): any => {
  return JSON.parse(content);
};

export const mergeContentAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    repositoryName: string;
    filename: string;
    content: string;
    baseBranch: string;
    commitMsg: string;
  }>({
    id: 'moonlight:merge-content',
    schema: {
      input: {
        required: [
          'repositoryName',
          'filename',
          'content',
          'baseBranch',
          'commitMsg',
        ],
        type: 'object',
        properties: {
          repositoryName: {
            type: 'string',
            title: 'repositoryName',
            description: 'Repository name',
          },
          filename: {
            type: 'string',
            title: 'filename',
            description: 'The .moonlight.yaml file name',
          },
          content: {
            type: 'string',
            title: 'content',
            description: 'The json manifest to add in file',
          },
          baseBranch: {
            type: 'string',
            title: 'base branch',
            description: "The repository's base branch",
          },
          commitMsg: {
            type: 'string',
            title: 'commit message',
            description: 'The message to adds in the commit',
          },
        },
      },
    },

    async handler(ctx) {
      const {
        repositoryName,
        filename,
        content: contentInput,
        baseBranch,
        commitMsg,
      } = ctx.input;
      const repoURL = `https://github.com/PicPay/${repositoryName}`;
      const baseURL = `https://api.github.com`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });

      const octokit = new Octokit({
        ...integrations,
        baseUrl: baseURL,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      const tempDirectory = await ctx.createTemporaryDirectory();
      const outputPath = resolveSafeChildPath(tempDirectory, './feature-flags');

      const contentRepository = new ContentsRepository(octokit);
      const mergeContentService = new MergeContentService(
        ctx.logger,
        contentRepository,
      );
      const contentAsObject = transformToObject(contentInput);

      const contentRequest: MergeContentRequestModel = {
        repository: repositoryName,
        filename: filename || '.moonlight.yaml',
        content: contentAsObject,
        tempDirectory: tempDirectory,
        featureFlagsDirectory: outputPath,
      };

      await mergeContentService.mergeContentAndWriteFile(contentRequest);

      try {
        ctx.logger.info(`pushing files from directory: ${outputPath}`);
        ctx.logger.info(`filename: ${contentRequest.filename}`);
        ctx.logger.info(`base repository: ${contentRequest.repository}`);
        ctx.logger.info(`new content: ${contentRequest.content}`);
        ctx.logger.info(
          `list files from directory: ${fs.readdirSync(outputPath)}`,
        );

        // TODO: This function is reusable by another plugin, in the future we'll transform it into a commons.
        await pushFilesToBranch(
          octokit,
          'PicPay',
          contentRequest.repository,
          baseBranch,
          baseBranch,
          outputPath,
          [contentRequest.filename],
          commitMsg,
        );
      } catch (e: any) {
        console.info(e);
      }
    },
  });
};
