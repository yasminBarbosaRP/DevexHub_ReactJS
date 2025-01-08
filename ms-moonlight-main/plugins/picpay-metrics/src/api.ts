import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import {
  ExhibitionPeriod,
  MetricsResponse,
  PullRequestResponse,
} from '@internal/plugin-picpay-metrics-backend';
import axios from 'axios';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

type MetricsParams = {
  startDate: Date;
  endDate: Date;
  exhibition: ExhibitionPeriod;
};

export type MetricsApi = {
  getMetricsByService(
    serviceName: string,
    params: MetricsParams
  ): Promise<MetricsResponse>;
  getMetricsByGroup(
    ownerNames: string[],
    entityName: string,
    params: MetricsParams
  ): Promise<MetricsResponse>;
};

export type PullRequestParams = {
  startDate: Date;
  endDate: Date;
  ownerName?: string;
  serviceName?: string;
};

type PullRequestsApi = {
  getPullRequests(params: PullRequestParams): Promise<PullRequestResponse>;
};

export const pullRequestsApiRef = createApiRef<PullRequestsApi>({
  id: 'pull-requests-api',
});

export class PullRequestsApiClient implements PullRequestsApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  public async getPullRequests(
    params: PullRequestParams
  ): Promise<PullRequestResponse> {
    const { token } = await this.identityApi.getCredentials();

    const response = await axios<PullRequestResponse>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/metrics/pull-request`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      params,
    });

    return response.data;
  }
}

export const metricsApiRef = createApiRef<MetricsApi>({
  id: 'metric-api',
});

export class MetricsApiClient implements MetricsApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  public async getMetricsByService(
    serviceName: string,
    params: MetricsParams
  ): Promise<MetricsResponse> {
    const { token } = await this.identityApi.getCredentials();

    const response = await axios<MetricsResponse>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/metrics/service/${serviceName}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      params,
    });

    return response.data;
  }

  public async getMetricsByGroup(
    ownerNames: string[],
    entityName: string,
    params: MetricsParams
  ): Promise<MetricsResponse> {
    const { token } = await this.identityApi.getCredentials();

    const response = await axios<MetricsResponse>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/metrics/group`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      params: { ...params, ownerNames, entityName },
    });

    return response.data;
  }
}
