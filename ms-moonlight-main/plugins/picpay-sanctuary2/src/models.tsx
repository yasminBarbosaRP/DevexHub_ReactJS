export enum StatusPage {
  loading = 1,
  success,
  error,
}

export enum Action {
  delete = 'delete',
  approver = 'approver',
}

export enum ProgressStatus {
  APPROVED = 'approved',
  SUCCESS = 'success',
  REJECTED = 'rejected',
  PENDING = 'pending',
  ERROR = 'error',
  SCHEDULED = 'scheduled',
  WAITING_FOR_APPROVAL = 'waiting_for_approval',
}

export enum ReviewerStatus {
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PENDING = 'pending',
}

export enum StepStatus {
  PENDING = 'pending',
  DONE = 'done',
}

export interface DeleteRequest {
  component: {
    id: string;
    name: string;
    kind: string;
  };
  reason?: string;
}

export interface ApproverRequest {
  component_id: string;
  reviewer: string;
  review_status: ReviewerStatus;
}

export interface Reviewer {
  githubProfile: string;
  email: string;
  status: ReviewerStatus | string;
}

export interface Step {
  type: string;
  title: string;
  status: StepStatus;
  events: StepEvent[];
}

export interface StepEvent {
  type: string;
  message: string;
  date: string | Date;
}

export enum Exceptions {
  COMPONENT_NOT_FOUND = 'COMPONENT_NOT_FOUND',
  GROUP_OWNER_NOT_FOUND = 'GROUP_OWNER_NOT_FOUND',
  REVIEWERS_NOT_FOUND = 'REVIEWERS_NOT_FOUND',
  FAILED_GET_REVIEWERS = 'FAILED_GET_REVIEWERS',
  FAILED_GET_OWNER = 'FAILED_GET_OWNER',
}

export interface Exception {
  data: Exceptions;
}

export interface StatusResponse {
  id?: string;
  component: {
    id: string;
    name: string;
  };
  requestedBy: string;
  reviewers: Reviewer[];
  resion: string;
  status: ProgressStatus;
  steps: Step[];
  updatedAt: string;
  createdAt: string;
  error?: boolean;
  message?: string;
  data?: Exception;
  deletionSchedule?: string;
  scheduleReminderEnabled?: boolean;
}

export interface PatchModel {
  component?: {
    id: string;
    name: string;
  };
  requestedBy?: string;
  owner?: string;
  reason?: string;
  operation?: 'delete';
  deletionSchedule?: string;
  scheduleReminderEnabled?: boolean;
}
