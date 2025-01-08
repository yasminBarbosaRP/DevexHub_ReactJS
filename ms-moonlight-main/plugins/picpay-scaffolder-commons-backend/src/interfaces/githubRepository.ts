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
  name: string;
  path: string;
  content?: string;
};
