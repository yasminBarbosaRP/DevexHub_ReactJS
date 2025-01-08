import { RepositoryVisibility } from '@internal/plugin-picpay-scaffolder-github-common';

export const RepositorySettingHistoryTable = 'repository_setting_histories';

export enum RepositorySettingHistoryStatus {
  created = 'created',
  notAllowed = 'not_allowed',
  error = 'error',
  done = 'done',
}

export interface RepositorySettingHistoryModel {
  id: any;
  user: string;
  repository: string;
  require_approvals: number;
  require_code_owner_reviews: boolean;
  delete_branch_on_merge: boolean;
  visibility: RepositoryVisibility;
  error: string | null;
  status: RepositorySettingHistoryStatus;
}
