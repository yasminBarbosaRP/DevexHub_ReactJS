import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

export type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type ComponentStatus = {
  id?: string;
  type: string;
  component: { name: string };
  requestedBy: string;
  reason?: string;
  status: string;
  owner: string;
  renaming?: object;
};

export type ComponentsStatusList = {
  data: ComponentStatus[];
};

export type FetchHistory = {
  getHistoryComponent(): Promise<ComponentsStatusList>;
};

export enum Status {
  Success = 'Success',
  Error = 'Error',
  Rejected = 'Rejected',
  InProgress = 'In Progress',
  WaitingApproval = 'Waiting Approval',
}

export enum Request {
  All = 'All',
  Delete = 'Delete',
}

export enum convertStatus {
  WaitingApproval = 'waiting_for_approval',
  NewWaitingApproval = 'waiting approval',
  Approved = 'approved',
  InProgress = 'in progress',
}
