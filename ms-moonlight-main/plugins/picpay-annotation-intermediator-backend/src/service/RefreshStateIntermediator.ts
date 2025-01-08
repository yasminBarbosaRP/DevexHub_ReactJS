import { Entity, stringifyEntityRef } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import { ConfigApi } from '@backstage/core-plugin-api';
import fetch from 'cross-fetch';
import { RefreshState } from '@internal/plugin-picpay-entity-refresh-status-backend';

export class RefreshStateIntermediator implements EntityProcessorIntermediator {
  /**
   *
   */

  constructor(
    private readonly logger: winston.Logger,
    private readonly backendUrl: string,
  ) {}

  static async init(
    logger: winston.Logger,
    config: ConfigApi,
  ): Promise<EntityProcessorIntermediator> {
    return new RefreshStateIntermediator(
      logger,
      config.getString('backend.baseUrl'),
    );
  }

  getName(): string {
    return 'cluster-identifier-intermediator';
  }

  async postHandle(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
  ): Promise<void> {
    if (process.env.REFRESH_STATE_INTERMEDIATOR_DISABLED === 'true') return
    const entityRef = stringifyEntityRef(entity);
    try {
      const refreshState = await fetch(
        `${this.backendUrl}/api/catalog/entities/refresh-state?entity_ref=${entityRef}`,
      );
      const refreshStateJson: { data: RefreshState[] } =
        await refreshState.json();
      if (refreshStateJson.data.length === 0) {
        this.logger.info(`No refresh_state found for entity ${entityRef}`);
        return;
      }
      entity.metadata.refreshState = {
        nextUpdateAt: refreshStateJson.data[0].next_update_at.toString(),
        updatedAt: new Date().toISOString(),
      };
    } catch (err) {
      this.logger.warn(
        `Unable to fetch refresh state for entity ${entityRef}: ${err}`,
      );
    }
  }
}
