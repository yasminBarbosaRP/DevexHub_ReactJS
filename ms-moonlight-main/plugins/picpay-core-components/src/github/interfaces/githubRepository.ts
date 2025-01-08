export type Settings = {
  active?: boolean;
  type: string;
  config: {
    url?: string;
  };
};

export type Files = {
  name: string;
  path?: string;
  content?: string;
};

export type RepositoryDetails = {
  repository: string;
  files: Files[];
  settings: Settings[];
};

export type ContentEntity = {
  name?: string;
  path?: string;
  content?: string;
};

export type BranchCommit = {
  sha: string;
  url: string;
}

export type BranchProtection = {
  enabled?: boolean;
  required_status_checks?: {
    enforcement_level?: string;
    contexts?: string[]
  }
}

export type BranchContent = {
  name: string,
  commit: BranchCommit
  protected?: boolean,
  protection?: BranchProtection,
  protection_url?: string
}

export type CreateUpdateContent = {
  content: ContentEntity | null;
  sha?: string;
  commit?: {
    sha?: string;
  };
}