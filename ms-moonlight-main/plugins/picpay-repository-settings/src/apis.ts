import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import { RepositorySettings } from '@internal/plugin-picpay-scaffolder-github-common';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type RepositorySettingsApi = {
  getRepositorySettings(entityName: string): Promise<RepositorySettings>;
  saveRepositorySettings(
    entityName: string,
    settings: RepositorySettings,
  ): Promise<RepositorySettings>;
};

export const RepositorySettingsApiRef = createApiRef<RepositorySettingsApi>({
  id: 'repository-settings-api',
});

export class RepositorySettingsApiClient implements RepositorySettingsApi {
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

    if (!response.ok) {
      const err = await response.json();
      return Promise.reject({ ...err, status: response.status });
    }

    return await response.json();
  }

  public async getRepositorySettings(
    entityName: string,
  ): Promise<RepositorySettings> {
    return await this.fetch<RepositorySettings>(
      `/api/github/repository/${entityName}/settings`,
      { method: 'GET' },
    );
  }
  public async saveRepositorySettings(
    entityName: string,
    settings: RepositorySettings,
  ): Promise<RepositorySettings> {
    return await this.fetch<RepositorySettings>(
      `/api/github/repository/${entityName}/settings`,
      { method: 'PATCH', body: JSON.stringify(settings) },
    );
  }
}
