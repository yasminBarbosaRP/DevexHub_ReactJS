import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import { Options, FetchPipelineRun, PipelineRunList } from './interfaces';

export const PipelineRunApiRef = createApiRef<FetchPipelineRun>({
  id: 'pipeline-run-api',
});

export class PipelineRunClient implements FetchPipelineRun {
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

    const headers = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const response = await fetch(`${url}${input}`, {
      ...headers,
      ...init,
    });

    if (!response.ok) {
      throw new Error(
        `Pipeline Run Fecth - Error! status: ${response.statusText}`,
      );
    }

    if (response.status !== 200) {
      throw new Error(await response.text());
    }

    return await response.json();
  }

  async getPipelineRun(): Promise<PipelineRunList> {
    const response = await this.fetch<PipelineRunList>('/api/pipeline-history');
    return response;
  }
}
