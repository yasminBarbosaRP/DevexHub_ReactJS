import { PluginDatabaseManager } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import { Database } from '../database/Database';
import { AnnotationUseCase } from '../interfaces/AnnotationUseCase';
import { Annotations } from './Annotations';
import nunjucks from 'nunjucks';

export class AnnotationIntermediator implements EntityProcessorIntermediator {
  private readonly njucks = nunjucks.configure({
    throwOnUndefined: true,
    autoescape: false,
  });

  constructor(
    private readonly logger: winston.Logger,
    readonly useCase: AnnotationUseCase,
  ) {}

  static async init(
    logger: winston.Logger,
    database: PluginDatabaseManager,
  ): Promise<EntityProcessorIntermediator> {
    const dbHandler = await Database.create({ database });
    const useCase = new Annotations({ database: dbHandler });
    return new AnnotationIntermediator(logger, useCase);
  }

  getName(): string {
    return 'annotation-intermediator';
  }

  async postHandle(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit,
  ): Promise<void> {
    if (process.env.ANNOTATION_INTERMEDIATOR_DISABLED === 'true') return
    const singleEntityQuery = {
      'metadata.name': entity.metadata.name,
      kind: entity.kind,
    };

    this.updateEntity(entity, singleEntityQuery);
    if (entity.spec && entity.spec.type) {
      const kindAndTypeQuery = {
        kind: entity.kind,
        'spec.type': entity.spec.type as string,
      };

      this.updateEntity(entity, kindAndTypeQuery);
    }
  }

  private async updateEntity(
    entity: Entity,
    query: Record<string, string>,
  ): Promise<void> {
    this.logger.debug(
      `${this.getName()} is handling ${
        entity.metadata.name
      } with query:${JSON.stringify(query)}`,
    );
    const results = await this.useCase.get(query);
    this.logger.debug(
      `${this.getName()} new fields for ${
        entity.metadata.name
      }: ${JSON.stringify(results)}`,
    );

    if (!entity.metadata.annotations && results.length > 0) {
      entity.metadata.annotations = {};
    }

    for (const item of results) {
      try {
        if (item.annotation) {
          const extraAnnotations = this.parseObject(item.annotation, entity);
          entity.metadata.annotations = {
            ...entity.metadata.annotations,
            ...extraAnnotations,
          };
        }

        if (item.extraFields) {
          const extraFields = this.parseObject(item.extraFields, entity);
          this.mergeObjects(entity, extraFields);
        }
        if (item.id) {
          item.error = undefined;
          this.useCase.update(item.id, item);
        }
      } catch (err: any) {
        if (item.id)
          this.useCase.update(item.id, {
            ...item,
            error: err.message.toString(),
          });
      }
    }
    this.logger.debug(
      `${this.getName()} included ${results.length} on ${entity.metadata.name}`,
    );
  }

  private parseObject(
    data: string | { [k: string]: any },
    entity: Entity,
  ): { [k: string]: any } {
    let extraAnnotations: { [k: string]: any } = {};
    let newData: { [k: string]: string | object } | any[] = {};

    if (typeof data === 'string') {
      newData = JSON.parse(data) as { [k: string]: any };
    } else {
      newData = data;
    }

    const keys = Array.isArray(newData) ? newData : Object.keys(newData);

    for (const key of keys) {
      if (typeof key === 'object') {
        extraAnnotations = {
          ...extraAnnotations,
          ...this.parseObject(key, entity),
        };
        continue;
      }
      if (typeof newData[key] !== 'string') {
        extraAnnotations[key] = this.parseObject(newData[key], entity);
        continue;
      }
      const result = this.njucks.renderString(newData[key] as string, entity);
      extraAnnotations[key] = result;
    }

    return extraAnnotations;
  }

  private mergeObjects(original: any, additional: any) {
    for (const key in additional) {
      if (additional.hasOwnProperty(key)) {
        if (original.hasOwnProperty(key)) {
          if (Array.isArray(original[key]) && Array.isArray(additional[key])) {
            original[key] = [...original[key], ...additional[key]];
          } else if (
            Array.isArray(original[key]) &&
            !Array.isArray(additional[key])
          ) {
            original[key] = [...original[key], additional[key]];
          } else if (
            typeof original[key] === 'object' &&
            typeof additional[key] === 'object'
          ) {
            this.mergeObjects(original[key], additional[key]);
          } else {
            original[key] = additional[key];
          }
        } else {
          original[key] = additional[key];
        }
      }
    }
  }
}
