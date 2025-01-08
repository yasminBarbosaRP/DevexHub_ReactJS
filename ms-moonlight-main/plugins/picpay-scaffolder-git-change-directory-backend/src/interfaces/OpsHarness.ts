import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { Octokit } from 'octokit';

export type OpsHarnessOptions = {
  context: ActionContext<{}>;
  githubAPI: Octokit;
};
