import { createRouter } from '@internal/plugin-picpay-metrics-backend';
import { PluginEnvironment } from '../types';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(env: PluginEnvironment) {
  const catalogApi = new CatalogClient({ discoveryApi: env.discovery });

  return createRouter({
    logger: env.logger,
    config: env.config,
    catalogApi
  });
}
