import {
  SingleHostDiscovery,
  createServiceBuilder,
  loadBackendConfig,
  useHotMemoize,
} from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import knexFactory from 'knex';
import { CatalogClient } from '@backstage/catalog-client';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const database = useHotMemoize(module, () => {
    const knex = knexFactory({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    knex.client.pool.on('createSuccess', (_eventId: any, resource: any) => {
      resource.run('PRAGMA foreign_keys = ON', () => {});
    });
    return knex;
  });

  const logger = options.logger.child({
    service: 'picpay-entity-refresh-status-backend',
  });
  logger.debug('Starting application server...');
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const discoveryApi = SingleHostDiscovery.fromConfig(config);
  discoveryApi.getBaseUrl = () =>
    Promise.resolve(`${config.get('backend.baseUrl')}/api/catalog`);
  const catalogClient = new CatalogClient({ discoveryApi });

  const router = await createRouter({
    logger,
    database,
    catalog: catalogClient,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/picpay-entity-refresh-status', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
