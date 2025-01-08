import {
  CatalogProcessorCache,
  CatalogProcessorEmit,
} from '@backstage/plugin-catalog-backend';
import { Entity } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';

export declare type EntityProcessorIntermediator = {
  getName(): string;
  postHandle?(
    entity: Entity,
    _location: LocationSpec,
    emit: CatalogProcessorEmit,
  ): Promise<void>;
  validateEntityKind?(entity: Entity): Promise<boolean>;
  preHandle?(
    entity: Entity,
    location: LocationSpec,
    emit: CatalogProcessorEmit,
    originLocation: LocationSpec,
    cache: CatalogProcessorCache,
  ): Promise<void>;
};
