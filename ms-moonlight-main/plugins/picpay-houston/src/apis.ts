import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export interface Flags {
  [name: string]: { value: boolean | string | object | null | undefined };
}

export type HoustonApi = {
  getFlags(): Promise<Flags>;
};

export const houstonApiRef = createApiRef<HoustonApi>({
  id: 'houston-api',
});

export class HoustonApiClient implements HoustonApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  public async getFlags(): Promise<Flags> {
    const { token } = await this.identityApi.getCredentials();

    const response = await fetch(
      `${this.configApi.getString('backend.baseUrl')}/api/houston/flags`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await response.json();
  }
}
