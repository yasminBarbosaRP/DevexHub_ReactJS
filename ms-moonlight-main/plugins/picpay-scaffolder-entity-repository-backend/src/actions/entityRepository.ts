import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError, NotFoundError } from '@backstage/errors';
import { Entity } from '@backstage/catalog-model';
import { CatalogApi, GetEntitiesResponse } from '@backstage/catalog-client';
import _ from 'lodash';

const getEntityRepository = (entity: Entity, org: string): string => {
  let currentComponent: string[] | null;
  if (
    entity?.metadata.annotations &&
    entity?.metadata.annotations['backstage.io/source-location']
  ) {
    const rule = new RegExp(`(?<=${org}\\/).*(?=\\/tree)`);
    currentComponent =
      entity.metadata.annotations['backstage.io/source-location'].match(rule);
  } else if (entity?.spec && entity?.spec.system) {
    currentComponent = new Array(entity?.spec.system?.toString());
  } else {
    currentComponent = [entity.metadata.name];
  }

  if (currentComponent && currentComponent.length > 0) {
    return currentComponent[0];
  }
  return '';
};

export const entityRepositoryAction = (catalogClient: CatalogApi) => {
  return createTemplateAction<{
    name: string;
    kind?: string;
    type?: string;
    namespace?: string;
    org?: string;
    breakOnError?: boolean;
    output?: { alias: string; key: string }[];
  }>({
    id: 'moonlight:entity-repository',
    supportsDryRun: true,
    schema: {
      input: {
        required: ['name'],
        properties: {
          name: {
            type: 'string',
            title: 'Entity Name',
            description: 'The name of the Entity',
          },
          kind: {
            type: 'string',
            title: 'Entity Kind',
            description: 'The Kind of the Entity',
          },
          type: {
            type: 'string',
            title: 'Entity type',
            description: 'The type of the Entity',
          },
          namespace: {
            type: 'string',
            title: 'Entity namespace',
            description: 'The namespace of the Entity',
          },
          org: {
            type: 'string',
            title: 'Github Organization',
            description: 'The name of the Organization',
          },
          breakOnError: {
            type: 'boolean',
            title: 'Breaks step on error',
            description: 'Breaks the step if an error occurs',
          },
          output: {
            type: 'array',
            title: 'Output',
            description: 'Keys that should be outputed by the action',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        name,
        kind,
        type,
        namespace,
        org = 'PicPay',
        breakOnError = true,
        output = [],
      } = ctx.input;

      const filter: { [k: string]: any } = {};

      if (name) filter['metadata.name'] = name;
      if (kind) filter.kind = kind;
      if (type) filter['spec.type'] = type;
      if (namespace) filter['metadata.namespace'] = namespace;
      ctx.logger.info(`using filter: ${JSON.stringify(filter)}`);
      const entities: GetEntitiesResponse = await catalogClient.getEntities({
        filter,
      });
      if (entities.items.length === 0) {
        if (!breakOnError) {
          ctx.logger.warn(`Component ${name} not found`);
          return;
        }
        throw new InputError(`Component ${name} not found`);
      }
      const entity = entities.items[0];
      const entityUrl = getEntityRepository(entity, org);
      ctx.logger.info(`entityRepository:${entityUrl}`);
      if (!entityUrl) {
        if (!breakOnError) {
          ctx.logger.warn(`Repository for Component ${name} not found`);
        } else {
          throw new NotFoundError(`Repository for Component ${name} not found`);
        }
      }

      ctx.output('entity_repository', entityUrl);

      for (const o of output) {
        ctx.output(o.alias, _.get(entity, o.key));
      }
    },
  });
};
