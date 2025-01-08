import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export interface Cluster {
  name: string;
  bu: string;
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

export type ArgoCDApi = {
  getClusters(): Promise<Cluster[]>;
  getClustersFromBU(bus: string[]): Promise<Cluster[]>;
};

export const argoCDApiRef = createApiRef<ArgoCDApi>({
  id: 'argocd-api',
});

export class ArgoCDApiClient implements ArgoCDApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;
  token: string | undefined;

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
    if (!response.ok)
      throw new Error(
        response.statusText || 'NPS - An unexpected error occurred.',
      );
    return await response.json();
  }

  async getClusters(): Promise<Cluster[]> {
    const response = await this.fetch<Cluster[]>('/api/argocd/clusters');
    return response;
  }

  async getClustersFromBU(bus: string[]): Promise<Cluster[]> {
    const response = await this.fetch<Cluster[]>(
      `/api/argocd/clusters?bu=${bus.join('&bu=')}`,
    );
    return response;
  }
}

