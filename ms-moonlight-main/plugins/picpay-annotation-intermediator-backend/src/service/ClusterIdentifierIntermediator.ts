import {
  Entity,
  getCompoundEntityRef,
  parseEntityRef,
  RELATION_DEPENDS_ON,
  RELATION_DEPENDENCY_OF,
} from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import {
  CatalogProcessorEmit,
  processingResult,
} from '@backstage/plugin-catalog-node';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import { ValidationError } from '../types/error';
import { IArgoCDRepository } from '@internal/plugin-picpay-argocd-backend';
import { ConfigApi } from '@backstage/core-plugin-api';
import fetch from 'cross-fetch';

export class ClusterIdentifierIntermediator
  implements EntityProcessorIntermediator {
  /**
   *
   */

  private catalogClusters: Entity[] = [];

  constructor(
    private readonly logger: winston.Logger,
    private readonly repository: IArgoCDRepository,
    private readonly backendUrl: string,
  ) { }

  static async init(
    logger: winston.Logger,
    repo: IArgoCDRepository,
    config: ConfigApi,
  ): Promise<EntityProcessorIntermediator> {
    return new ClusterIdentifierIntermediator(
      logger,
      repo,
      config.getString('backend.baseUrl'),
    );
  }

  async getClusters(): Promise<Entity[]> {
    if (!this.catalogClusters || this.catalogClusters.length === 0) {
      const clusters = await fetch(
        `${this.backendUrl}/api/catalog/entities?filter=spec.type=eks`,
        {
          headers: {
            'x-application-name': 'ms-moonlight'
          }
        }
      );
      if (!clusters || !clusters.ok) {
        throw new Error(`unable to fetch clusters from catalog`);
      }
      this.catalogClusters = await clusters.json();
    }
    return this.catalogClusters;
  }

  getName(): string {
    return 'cluster-identifier-intermediator';
  }

  async postHandle(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
  ): Promise<void> {
    if (process.env.CLUSTER_INTERMEDIATOR_DISABLED === 'true') return
    if (
      entity.kind.toLocaleLowerCase() !== 'component' &&
      entity.spec?.type !== 'service'
    ) {
      this.logger.debug(
        `no conditions met to identify cluster info for entity ${entity.metadata.name}`,
      );
      return;
    }

    const url = entity.metadata.annotations
      ? entity.metadata.annotations['backstage.io/source-location']
      : '';

    if (!url)
      throw new ValidationError(
        `annotation backstage.io/source-location not found for ${entity.metadata.name}`,
      );

    const regex = /PicPay\/(.*?)\/tree/;
    const match = regex.exec(url);
    if (!match)
      throw new ValidationError(
        `annotation backstage.io/source-location not found for ${entity.metadata.name} despite annotation is there`,
      );

    const repoUrl = match[1];
    const catalogClusters = await this.getClusters();

    const clusters = await this.repository.GetApplicationClusters(repoUrl);
    if (!clusters || clusters.length === 0) {
      this.logger.debug(`no cluster found for entity ${entity.metadata.name}`);
      return;
    }

    for (const cluster of clusters) {
      entity.metadata.annotations = {
        ...entity.metadata.annotations,
        [`moonlight.picpay/cluster-${cluster.environment}`]: cluster.cluster,
      };

      const clusterItems = catalogClusters.filter((e: Entity) => e.metadata.annotations && e.metadata.annotations['backstage.io/kubernetes-id'] === cluster.cluster);
      if (!clusterItems || clusterItems.length === 0) {
        this.logger.warn(
          `unable to find cluster relations for ${entity.metadata.name} using cluster ${cluster.cluster}, perhaps this cluster is not in the catalog`,
        );
        continue;
      }
      const selfRef = getCompoundEntityRef(entity);

      for (const item of clusterItems) {
        const targetRef = parseEntityRef(item.metadata.name, {
          defaultKind: item.kind,
          defaultNamespace: selfRef.namespace,
        });
        _emit(
          processingResult.relation({
            source: selfRef,
            type: RELATION_DEPENDS_ON,
            target: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
          }),
        );
        _emit(
          processingResult.relation({
            source: {
              kind: targetRef.kind,
              namespace: targetRef.namespace,
              name: targetRef.name,
            },
            type: RELATION_DEPENDENCY_OF,
            target: selfRef,
          }),
        );
      }
    }

    this.logger.debug(
      `clusters successfully included for entity ${entity.metadata.name
      }, relations:${JSON.stringify(entity.relations)}`,
    );
  }
}
