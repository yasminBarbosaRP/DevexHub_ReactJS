import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};


export interface GithubContents {
  type: string;
  encoding: string;
  size: 5362;
  name: string;
  path: string;
  content: string;
  sha: string;
  url: string;
  git_url: string;
  html_url: string;
  download_url: string;
  _links: {
    git: string;
    self: string;
    html: string;
  };
}

export interface GithubRepoBranches {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  protected: boolean;
  protection: {
    required_status_checks: {
      enforcement_level: string;
      contexts: string[];
    };
  };
  protection_url: string;
}

export interface GithubRepository {
  id?: number;
  name?: string;
  created_at: string | Date;
  error?: {
    name: string;
    message: string;
    status: number;
    stack: string;
  };
}

export interface GithubIssue {
  id: number;
  node_id: string;
  url: string;
  repository_url: string;
  labels_url: string;
  comments_url: string;
  events_url: string;
  html_url: string;
  number: number;
  state: 'open' | 'closed';
  title: string;
  body: string;
  user: {
    login: string;
    id: number;
    node_id: string;
    avatar_url: string;
    gravatar_id: string;
    url: string;
    html_url: string;
    followers_url: string;
    following_url: string;
    gists_url: string;
    starred_url: string;
    subscriptions_url: string;
    organizations_url: string;
    repos_url: string;
    events_url: string;
    received_events_url: string;
    type: string;
    site_admin: boolean;
  };
  labels: Array<{
    id: number;
    node_id: string;
    url: string;
    name: string;
    color: string;
    default: boolean;
    description: string;
  }>;
  assignee: string;
  assignees: string[];
  milestone: string;
  locked: boolean;
  active_lock_reason: string;
  comments: number;
  pull_request: {
    url: string;
    html_url: string;
    diff_url: string;
    patch_url: string;
  };
  closed_at: string;
  created_at: string;
  updated_at: string;
}

export type GithubApi = {
  getBranches(repo: string): Promise<GithubRepoBranches[]>;
  getClustersFromBU(repo: string, file: string): Promise<GithubContents>;
  getRepo(repo: string): Promise<GithubRepository>;
  getIssues(repo: string): Promise<GithubIssue[]>;
};

export const githubApiRef = createApiRef<GithubApi>({
  id: 'github-api',
});

export class GithubApiClient implements GithubApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  private async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
    const { token } = await this.identityApi.getCredentials();
    const url = this.configApi.getString('backend.baseUrl');
    const response = await fetch(`${url}${input}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...init,
    });

    if (response.status > 299) {
      return JSON.parse(await response.text());
    }

    return await response.json();
  }

  async getIssues(repo: string): Promise<GithubIssue[]> {
    const response = await this.fetch<GithubIssue[]>(`/api/github/${repo}/issues`);
    return response;
  }


  async getBranches(repo: string): Promise<GithubRepoBranches[]> {
    const response = await this.fetch<GithubRepoBranches[]>(
      `/api/github/branches/${repo}`,
    );
    return response;
  }

  async getClustersFromBU(repo: string, file: string): Promise<GithubContents> {
    const response = await this.fetch<GithubContents>(
      `/api/github/file/${repo}/${file}`,
    );
    return response;
  }

  async getRepo(repo: string): Promise<GithubRepository> {
    const response = await this.fetch<GithubRepository>(
      `/api/github/repository-data/${repo}`,
    );

    return response;
  }

}

