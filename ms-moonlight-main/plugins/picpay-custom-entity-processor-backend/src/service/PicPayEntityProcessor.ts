import { Entity } from '@backstage/catalog-model';
import {
  CatalogProcessor,
  CatalogProcessorCache,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-node';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '../interfaces/EntityProcessorIntermediator';

export class PicPayEntityProcessor implements CatalogProcessor {
  /**
   *
   */
  constructor(
    private readonly logger: winston.Logger,
    private readonly intermediators: Array<EntityProcessorIntermediator> = [],
  ) {
  }

  getProcessorName(): string {
    return 'picpay-entity-processor';
  }

  async validateEntityKind(entity: Entity): Promise<boolean> {
    for (const intermediator of this.intermediators) {
      if (!intermediator.validateEntityKind) {
        this.logger.debug(
          `intermediator ${intermediator.getName()} has no validateEntityKind method`,
        );
        continue;
      }
      try {
        this.logger.debug(
          `validate-entity-kind:${intermediator.getName()} ${
            entity.metadata.name
          }`,
        );
        if (!(await intermediator.validateEntityKind(entity))) {
          return false;
        }
      } catch (err) {
        this.logger.error(
          `${intermediator.getName()} failed to validate ${
            entity.metadata.name
          } due error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
        );
        return false;
      }
    }
    return Promise.resolve(true);
  }

  async preProcessEntity(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
    originLocation: LocationSpec,
    cache: CatalogProcessorCache,
  ): Promise<Entity> {
    for (const intermediator of this.intermediators) {
      if (!intermediator.preHandle) {
        this.logger.debug(
          `intermediator ${intermediator.getName()} has no preHandle method`,
        );
        continue;
      }
      try {
        this.logger.debug(
          `post-process-entity:${intermediator.getName()} ${
            entity.metadata.name
          }`,
        );
        await intermediator.preHandle(
          entity,
          location,
          emit,
          originLocation,
          cache,
        );
      } catch (err) {
        this.logger.error(
          `${intermediator.getName()} failed to post-process ${
            entity.metadata.name
          } due error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
        );
      }
    }
    return Promise.resolve(entity);
  }

  async postProcessEntity(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<Entity> {
    for (const intermediator of this.intermediators) {
      if (!intermediator.postHandle) {
        this.logger.debug(
          `intermediator ${intermediator.getName()} has no postHandle method`,
        );
        continue;
      }
      try {
        this.logger.debug(
          `post-process-entity:${intermediator.getName()} ${
            entity.metadata.name
          }`,
        );
        await intermediator.postHandle(entity, _location, emit);
      } catch (err) {
        this.logger.error(
          `${intermediator.getName()} failed to post-process ${
            entity.metadata.name
          } due error: ${JSON.stringify(err, Object.getOwnPropertyNames(err))}`,
        );
      }
    }
    if (entity.metadata.name === "ms-katchau-accelerate-metrics") {
      console.info("moonlight")
    }
    return entity;
  }
}
