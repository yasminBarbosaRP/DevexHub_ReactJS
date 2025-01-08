export interface Owner {
  label: string;
  value: string;
}

export enum Request {
  All = 'all',
  Delete = 'delete',
  Recovery = 'recovery',
}

export enum Status {
  All = 'all',
  Success = 'success',
  Error = 'error',
  Approved = 'approved',
  Rejected = 'rejected',
  WaitingApproval = 'waiting_for_approval',
}
