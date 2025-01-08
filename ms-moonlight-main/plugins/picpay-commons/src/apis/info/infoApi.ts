import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import { Info, InfoApi } from './types';
import { FullAdditionalInformation, Members } from '@internal/plugin-picpay-entity-provider-backend';

export const InfoApiRef = createApiRef<InfoApi>({
  id: 'info-api',
});

export class InfoApiClient implements InfoApi {
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

  async getInfo(): Promise<Info> {
    const response = await this.fetch<Info>(`/api/users/info`);
    return response;
  }

  async getMembers(id: string): Promise<Members[]> {
    const response = await this.fetch<{ data: Members[] }>(`/api/entity-provider/additional-information/${id}/members`);
    return response.data;
  }

  async getFullAdditionalInformation(entityRef: string): Promise<FullAdditionalInformation[]> {
    const response = await this.fetch<{ data: FullAdditionalInformation[] }>(
      `/api/entity-provider/additional-information?entityRef=${encodeURIComponent(entityRef)}`
    );
    return response.data;
  }
}
