import { Octokit } from 'octokit';
import { UrlReader } from '@backstage/backend-common';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrations } from '@backstage/integration';

export type MergeContentRequestModel = {
  repository: string;
  filename: string;
  content: any;
  tempDirectory: string;
  featureFlagsDirectory: string;
};

export type SaveContentRequestModel = {
  repository: string;
  filename: string;
  content: string;
  sha: string;
};

export type ContentsRepositoryOptions = {
  reader: UrlReader;
  integrations: ScmIntegrations;
  githubApi: Octokit;
  context: ActionContext<{}>;
  repository: string;
  temporaryDirectory: string;
};
