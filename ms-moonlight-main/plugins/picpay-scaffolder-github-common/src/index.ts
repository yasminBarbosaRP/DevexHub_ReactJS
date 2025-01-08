export enum RepositoryVisibility {
  public = 'public',
  restricted = 'restricted',
  private = 'private',
  unknown = 'unknown',
}

export interface RepositorySettings {
  projectSlug: string;
  canUpdateSetting: boolean;
  requireApprovals: number;
  requireCodeOwnerReviews: boolean;
  deleteBranchOnMerge: boolean;
  protectionExists: boolean;
  visibility: RepositoryVisibility;
}
