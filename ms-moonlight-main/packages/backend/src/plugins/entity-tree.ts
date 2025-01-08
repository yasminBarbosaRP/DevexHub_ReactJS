import { createRouter } from '@internal/plugin-picpay-entity-tree-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const catalogClient = new CatalogClient({
    discoveryApi: env.discovery,
  });

  return createRouter({
    logger: env.logger,
    catalog: catalogClient,
    discovery: env.discovery,
  });
}
