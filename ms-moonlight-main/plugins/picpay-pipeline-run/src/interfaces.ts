import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

export type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type PipelineRun = {
  pipeline_id: string;
  pipeline: string;
  status: Status;
  start: string;
  estimated_time: string;
  duration: string;
  ci_cd: string;
};

export interface PipelineRunList {
  data: PipelineRun[];
}

export enum Status {
  All = 'All',
  Running = 'Running',
  Success = 'Success',
  Error = 'Error',
}

export enum PipelineStatus {
  All = 'All',
  PullRequest = 'pull-request',
  DeployQA = 'deploy-qa',
  PushMain = 'push-main',
  DeployProd = 'deploy-prod',
}

export type FetchPipelineRun = {
  getPipelineRun(): Promise<PipelineRunList>;
};
