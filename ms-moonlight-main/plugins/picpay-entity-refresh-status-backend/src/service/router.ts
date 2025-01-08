import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Knex } from 'knex';
import { Logger } from 'winston';
import RefreshStateRepository from '../repository/refreshState';
import { CatalogApi } from '@backstage/catalog-client';
import { stringifyEntityRef } from '@backstage/catalog-model';

export interface RouterOptions {
  logger: Logger;
  database: Knex;
  catalog: CatalogApi;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  const repository = new RefreshStateRepository(options.database);
  router.use(express.json());

  router.get('/', async (req, response) => {
    const result = await repository.getEntityRefreshState(
      req.query.entity_ref as string,
      (req.query.order as string) || 'asc',
      parseInt((req.query.limit as string) || '10', 10) as number,
    );
    response.json({ data: result });
  });
  router.post('/force/:kind/:namespace/:name', async (req, response) => {
    const { kind, namespace, name } = req.params;

    if (!kind) {
      response.status(400).json({ error: 'kind is required' });
      return;
    }
    if (!namespace) {
      response.status(400).json({ error: 'namespace is required' });
      return;
    }
    if (!name) {
      response.status(400).json({ error: 'name is required' });
      return;
    }

    const actualSeconds =
      parseInt((req.body.seconds as string) || '0', 10) ?? 0;
    const refreshAt = new Date();
    refreshAt.setSeconds(refreshAt.getSeconds() + actualSeconds);

    const entityRef = `${kind}:${namespace ?? 'default'}/${name}`.toLowerCase();

    const result: { [k: string]: any } = {};

    const ancestors = await options.catalog.getEntityAncestors({
      entityRef,
    });

    const locationAncestor = ancestors.items.find(el => el.entity.kind.toLocaleLowerCase('en-US') === 'location');
    if (locationAncestor) {
      const locationRef = stringifyEntityRef(locationAncestor.entity);
      result[locationRef] = await repository.forceRefresh(locationRef, refreshAt);
    }
    result[entityRef] = await repository.forceRefresh(entityRef, refreshAt);

    response.status(200).json({
      entityRef: entityRef,
      refreshAt: refreshAt.toISOString(),
      updates: result,
    });
  });
  router.use(errorHandler());
  return router;
}
