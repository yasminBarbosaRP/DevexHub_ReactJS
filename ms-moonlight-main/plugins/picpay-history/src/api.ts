import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import {
  Options,
  ComponentsStatusList,
  FetchHistory,
} from './components/FetchHistory/interfaces';

export const HistoryApiRef = createApiRef<FetchHistory>({
  id: 'history-api',
});

export class HistoryApi implements FetchHistory {
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

    if (!response.ok) {
      throw new Error(
        response.statusText || 'History - An unexpected error occurred.',
      );
    }

    return await response.json();
  }

  async getHistoryComponent(): Promise<ComponentsStatusList> {
    const response = await this.fetch<ComponentsStatusList>(
      '/api/sanctuary-two/components',
    );
    return response;
  }
}
