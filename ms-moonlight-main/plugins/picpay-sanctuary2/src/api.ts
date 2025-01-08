import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import {
  ApproverRequest,
  DeleteRequest,
  PatchModel,
  StatusResponse,
} from './models';

export type Sanctuary2Api = {
  getStatus(componentId: string, kind: string): Promise<StatusResponse>;
  getStatusByID(id: string): Promise<StatusResponse>;
  postDelete(request: DeleteRequest): Promise<StatusResponse>;
  postApprover(request: ApproverRequest): Promise<StatusResponse>;
  postRetry(id: string): Promise<StatusResponse>;
  patch(id: string, request: PatchModel): Promise<StatusResponse>;
  deleteRequest(id: string): Promise<StatusResponse>;
};

export const Sanctuary2ApiRef = createApiRef<Sanctuary2Api>({
  id: 'santuary2-api',
});

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export class Sanctuary2ApiClient implements Sanctuary2Api {
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
      const errorPayload = await response.json();
      const errorMessage = errorPayload.data || response.statusText;
      throw new Error(errorMessage);
    }

    return await response.json();
  }

  async postDelete(request: DeleteRequest): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      '/api/sanctuary-two/component',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );
    return response;
  }

  async postApprover(request: ApproverRequest): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      '/api/sanctuary-two/review',
      {
        method: 'POST',
        body: JSON.stringify(request),
      },
    );
    return response;
  }

  async postRetry(id: string): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      `/api/sanctuary-two/component/${id}/retry`,
      {
        method: 'POST',
      },
    );
    return response;
  }

  async patch(id: string, req: PatchModel): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      `/api/sanctuary-two/component/${id}`,
      {
        method: 'PATCH',
        body: JSON.stringify(req),
      },
    );
    return response;
  }

  async deleteRequest(id: string): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      `/api/sanctuary-two/component/${id}`,
      {
        method: 'DELETE',
      },
    );
    return response;
  }

  async getStatus(appName: string, kind?: string): Promise<StatusResponse> {
    const kindParam = kind ? `/${kind}` : '';
    const response = await this.fetch<StatusResponse>(
      `/api/sanctuary-two/component/${appName}${kindParam}`,
    );
    return response;
  }

  async getStatusByID(id: string): Promise<StatusResponse> {
    const response = await this.fetch<StatusResponse>(
      `/api/sanctuary-two/status/${id}`,
    );
    return response;
  }
}
