import {
  PluginEndpointDiscovery,
  errorHandler,
} from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import mountTreeByEntityName from './mountTreeByEntityName';

export interface RouterOptions {
  logger: Logger;
  catalog?: CatalogApi;
  discovery?: PluginEndpointDiscovery;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger } = options;

  let catalog: CatalogApi;

  if (options.catalog) {
    catalog = options.catalog;
  } else if (options.discovery) {
    catalog = new CatalogClient({ discoveryApi: options.discovery });
  } else {
    throw new Error('CatalogApi is required');
  }

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/:namespace?/:kind?/:name/parents/', async (request, response) => {
    void (async () => {
      const namespace = request.params.namespace || 'default';
      let kind = request.params.kind || undefined;

      if (kind) {
        kind = kind[0].toUpperCase() + kind.substring(1);
      }

      const result = await mountTreeByEntityName(catalog, request.params.name, namespace, kind);

      if (!result) {
        response.sendStatus(404);
        return;
      }

      response.json(result);
    })();
  });

  router.use(errorHandler());
  return router;
}
