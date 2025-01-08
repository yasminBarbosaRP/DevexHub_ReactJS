import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';


type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type ManageTemplateVersionApi = {
  update(request: ManageTemplateRequest): Promise<any>;
};

export interface ManageTemplateRequest {
  hash: string;
  name: string;
  repository: string;
  branch: string;
}

export interface ManageTemplateResponse {
  status: string;
}

export const ManageTemplateVersionApiRef = createApiRef<ManageTemplateVersionApi>({
  id: 'manage-template-version-api',
});

export class ManageTemplateVersionApiClient {
  private configApi: ConfigApi;
  private identityApi: IdentityApi;

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
      return Promise.reject(response);
    }

    return await response.json();
  }

  public async update(request: ManageTemplateRequest): Promise<any> {
    const response = await this.fetch<ManageTemplateResponse>(`/api/manage-template-version/commit`, {
      method: 'POST',
      body: JSON.stringify(request),
    });

    return response;
  }
}