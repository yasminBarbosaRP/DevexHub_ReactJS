import { createRouter } from '@internal/plugin-picpay-scaffolder-github-backend';
import { PluginEnvironment } from '../types';
import { ConfigApi } from '@backstage/core-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(
  config: ConfigApi,
  env: PluginEnvironment,
) {
  const catalogApi = new CatalogClient({ discoveryApi: env.discovery });

  return createRouter({
    config,
    logger: env.logger,
    database: env.database,
    catalogApi: catalogApi,
  });
}
