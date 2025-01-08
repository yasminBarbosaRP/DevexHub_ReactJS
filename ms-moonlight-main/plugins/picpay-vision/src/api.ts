import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';
import { VisionCatalogContent, ScoreTestCertified, ScoreTestMetricsDetails } from '@internal/plugin-picpay-vision-backend';
import axios from 'axios';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type VisionApi = {
  getVisionCatalogContent(entityName: string): Promise<VisionCatalogContent>;
  enableToolForProject(entityName: string, sourceId: string): Promise<void>;
  disableToolForProject(entityName: string, sourceId: string): Promise<void>;
  refreshChecksForProject(entityName: string): Promise<void>;
  getGroupsScore(source: number, groups: string[]): Promise<ScoreTestCertified>;
  getScoreTestMetricsDetails(source: number, groups: string[], metrics: string[]): Promise<ScoreTestMetricsDetails>;
};

export const visionApiRef = createApiRef<VisionApi>({
  id: 'vision-api',
});

export class VisionApiClient implements VisionApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }
  public async getGroupsScore(source: number, groups: string[]): Promise<ScoreTestCertified> {
    const { token } = await this.identityApi.getCredentials();
    
    const params = new URLSearchParams();
    groups.forEach(group => params.append('squads', group));
  
    const response = await axios<ScoreTestCertified>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/${source}/score?${params.toString()}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  
    return response.data;
  }

  public async getScoreTestMetricsDetails(source: number, groups: string[], metrics: string[]): Promise<ScoreTestMetricsDetails> {
    const { token } = await this.identityApi.getCredentials();
    
    const params = new URLSearchParams();
    groups.forEach(group => params.append('squads', group));
    metrics.forEach(metric => params.append('metrics', metric));

    const response = await axios<ScoreTestMetricsDetails>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/${source}/metrics/projects?${params.toString()}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  
    return response.data;
  }

  public async getVisionCatalogContent(
    entityName: string,
  ): Promise<VisionCatalogContent> {
    const { token } = await this.identityApi.getCredentials();

    const response = await axios<VisionCatalogContent>({
      method: 'GET',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/catalog/${entityName}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return response.data;
  }

  public async enableToolForProject(
    entityName: string,
    sourceId: string,
  ): Promise<void> {
    const { token } = await this.identityApi.getCredentials();

    await axios({
      method: 'POST',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/catalog/${entityName}/sources`,
      data: { sourceId },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return;
  }

  public async disableToolForProject(
    entityName: string,
    sourceId: string,
  ): Promise<void> {
    const { token } = await this.identityApi.getCredentials();

    await axios({
      method: 'DELETE',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/catalog/${entityName}/sources/${sourceId}`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return;
  }

  public async refreshChecksForProject(entityName: string): Promise<void> {
    const { token } = await this.identityApi.getCredentials();

    await axios({
      method: 'POST',
      baseURL: this.configApi.getString('backend.baseUrl'),
      url: `/api/vision/catalog/${entityName}/refresh`,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    return;
  }
}
