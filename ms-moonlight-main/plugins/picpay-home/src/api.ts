import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import { Response } from './models';

export type HomeApi = {
  getData(appName: string): Promise<Response>;
};

export const HomeApiRef = createApiRef<HomeApi>({
  id: 'home-api',
});

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export class HomeApiClient implements HomeApi {
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
        response.statusText || 'Home - An unexpected error occurred.',
      );
    return await response.json();
  }

  async getData(appName: string): Promise<Response> {
    const response = await this.fetch<Response>(`/api/test/${appName}`);
    return response;
  }


}
