import { ConfigApi } from '@backstage/core-plugin-api';
import axios, { AxiosInstance } from 'axios';
import { AppCluster, ArgoCDRepository, Clusters } from '../interfaces/argocd';
import {
  ApplicationResponse,
  ClustersResponse,
} from './response';
import * as winston from 'winston';

const HOM_SUFFIX = 'hom';
const PRD_SUFFIX = 'prd';

type ArgoInstance = { environments: string[], token?: string, api: AxiosInstance };

export class ArgoCDRepositoryImpl implements ArgoCDRepository {
  private readonly logger: winston.Logger;
  private instances: ArgoInstance[] = [];

  constructor(config: ConfigApi, logger: winston.Logger) {
    this.logger = logger;
    for (const cfg of config.getConfigArray('argocd')) {
      this.instances.push({
        environments: cfg.getStringArray('environments'),
        token: cfg.getString('token'),
        api: axios.create({
          baseURL: cfg.getString('url'),
        }),
      })
    }
  }

  async GetApplicationClusters(app: string): Promise<AppCluster[]> {
    this.logger.info('getting clusters from argocd');
    const response: AppCluster[] = [];

    for (const env of [HOM_SUFFIX, PRD_SUFFIX]) {
      const cluster = await this.getCluster(`${app}-${env}`, [env]);
      if (cluster) response.push(cluster);
    }

    return Promise.resolve(response);
  }
  async GetClusters(): Promise<Clusters[]> {
    this.logger.info('getting clusters from argocd');
    const result: Clusters[] = [];
    for (const argocd of this.instances) {
      const clusters = await argocd.api.get<ClustersResponse>('/api/v1/clusters', {
        headers: {
          Authorization: `Bearer ${argocd.token}`,
        },
      });

      if (clusters.status === 401) {
        this.logger.warn(`ArgoCd for ${argocd.environments} returned unauthorized`);
        continue;
      }
      if (clusters.status !== 200) {
        this.logger.warn(
          `invalid response code from ArgoCd for ${argocd.environments} request: GET ${argocd.api.getUri()}/api/v1/clusters status_code: ${clusters.status}: ${clusters.data}`,
        );
        continue;
      }

      const response: Clusters[] = clusters.data.items.map(el => {
        const businessUnit = el.labels ? el.labels.bu : undefined;
        if (!businessUnit) {
          return {
            name: el.name,
            bu: 'unknown',
          };
        }

        return {
          name: el.name,
          bu: businessUnit,
        };
      });
      result.push(...response);
    }
    return Promise.resolve(result);
  }

  private async getCluster(
    name: string,
    environments?: string[]
  ): Promise<{
    app: string;
    environment: string;
    cluster: string;
  } | null> {
    let instances = this.instances;

    if (environments && environments.length > 0) {
      instances = this.instances.filter(i => i.environments.some(env => environments?.includes(env)))
    }

    for (const argocd of instances) {
      try {
        const application = await argocd.api.get<ApplicationResponse>(
          `/api/v1/applications/${name}`,
          {
            headers: {
              Authorization: `Bearer ${argocd.token}`,
            },
          },
        );
        return {
          app: name,
          environment: name.slice(name.lastIndexOf('-') + 1, name.length),
          cluster:
            application.data.metadata.clusterName ||
            application.data.spec.destination.name,
        };
      } catch (err: any) {
        if (!axios.isAxiosError(err)) throw err;
        if (err.response?.status === 401) {
          this.logger.warn(`argocd for ${argocd.environments} returned unauthorized`);
          continue;
        }

        if (err.response?.status === 404) {
          continue
        }

        if (err.response?.status !== 200) {
          this.logger.warn(
            `invalid response code from ArgoCd Instance for ${argocd.environments} request: GET ${argocd.api.getUri()}/api/v1/applications/${name} with status_code: ${err.response?.status}: ${err.message}`,
          );
          continue;
        }
      }
      return null;
    }
    return null;
  }
}
