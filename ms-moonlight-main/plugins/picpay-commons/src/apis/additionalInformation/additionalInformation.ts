import {
    createApiRef,
    ConfigApi,
    IdentityApi,
  } from '@backstage/core-plugin-api';
  import { AdditionalInformation, AdditionalInformationApi } from './types';
  
  export const additionalInformationApiRef = createApiRef<AdditionalInformationApi>({
    id: 'additional-information-api',
  });
  
  export class AdditionalInformationApiClient implements AdditionalInformationApi {
    configApi: ConfigApi;
    identityApi: IdentityApi;
    token: string | undefined;
  
    constructor(options: { configApi: ConfigApi; identityApi: IdentityApi }) {
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
          response.statusText || 'Info - An unexpected error occurred.'
        );
      }
  
      return response.json();
    }
  
    async getByEntityRef(entityRef: string): Promise<AdditionalInformation[]> {
      const { data } = await this.fetch<{ data: AdditionalInformation[] }>(`/api/entity-provider/additional-information?entityRef=${entityRef}`);
  
      return data;
    }
  }
  