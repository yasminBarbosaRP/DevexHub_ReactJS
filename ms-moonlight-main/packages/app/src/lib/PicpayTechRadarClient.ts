import {
  TechRadarApi,
  TechRadarLoaderResponse,
} from '@backstage-community/plugin-tech-radar';
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { Config } from '@backstage/config';

export class PicpayTechRadarClient implements TechRadarApi {
  private readonly configApi: ConfigApi;
  private readonly identityApi: IdentityApi;

  private constructor(configApi: ConfigApi, identityApi: IdentityApi) {
    this.configApi = configApi;
    this.identityApi = identityApi;
  }

  static fromConfig(config: Config, identityApi: IdentityApi) {
    return new PicpayTechRadarClient(config, identityApi);
  }

  private async fetch(
    input: string,
    init?: RequestInit,
  ): Promise<TechRadarLoaderResponse> {
    const url = this.configApi.getString('backend.baseUrl');
    const { token } = await this.identityApi.getCredentials();

    const headers = {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
      'Content-Type': 'application/json',
    };

    const response = await fetch(`${url}${input}`, {
      ...headers,
      ...init,
    });

    if (!response.ok) {
      throw new Error(
        `Tech Radar Fecth - Error! status: ${response.statusText}`,
      );
    }

    const jsonResponse = (await response.json()) as TechRadarLoaderResponse;

    return {
      ...jsonResponse,
      entries: jsonResponse.entries.map(entry => ({
        ...entry,
        timeline: entry.timeline.map(v => ({
          ...v,
          date: new Date(v.date),
        })),
      })),
    };
  }

  async load(_id: string | undefined): Promise<TechRadarLoaderResponse> {
    const input = `/api/github/file/arqr-tech-radar/data.json`;
    return await this.fetch(input);
  }
}
