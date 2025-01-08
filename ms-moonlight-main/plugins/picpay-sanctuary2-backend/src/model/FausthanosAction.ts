import { JsonObject } from '@backstage/types';

export type FausthanosAction = {
  id?: string;
  component: {
    id: string;
    name: string;
  };
  requestedBy: string;
  reviewers: Reviewers[];
  reason?: string;
  status: string;
  requestType: string;
  owner: string;
  steps: Steps[];
  renaming?: object;
  createdAt: string | Date;
  updatedAt: string | Date;
};

export type DeletionData = JsonObject & {
  backupPath?: string;
  steps: Steps[];
};

export type Steps = {
  type: string;
  title: string;
  status: string;
  message: string;
  createdAt: string | Date;
};

export type Reviewers = {
  githubProfile: string;
  email: string;
  approved: boolean;
};
