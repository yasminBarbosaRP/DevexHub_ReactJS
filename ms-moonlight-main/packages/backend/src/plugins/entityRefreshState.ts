import { createRouter } from '@internal/plugin-picpay-entity-refresh-status-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogApi = new CatalogClient({ discoveryApi: env.discovery });

  return createRouter({
    logger: env.logger,
    database: await env.database.getClient(),
    catalog: catalogApi,
  });
}
