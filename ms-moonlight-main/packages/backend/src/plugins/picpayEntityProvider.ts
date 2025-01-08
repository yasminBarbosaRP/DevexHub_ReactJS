import { CatalogClient } from '@backstage/catalog-client';
import { Database, createRouter } from '@internal/plugin-picpay-entity-provider-backend';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  {
    logger,
    config,
    database,
    discovery,
    scheduler,
  }: PluginEnvironment,
  catalogEnvironment: PluginEnvironment,
) {
  const catalogApi = new CatalogClient({ discoveryApi: discovery });

  return createRouter({
    logger,
    config,
    catalogApi,
    database: await Database.create(database, catalogEnvironment.database),
    scheduler,
  });
}
