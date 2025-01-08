import {
  HostDiscovery,
  createServiceBuilder,
  loadBackendConfig,
  useHotMemoize,
} from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import Knex from 'knex';
import { Database } from '../database/Database';
import { CatalogClient } from '@backstage/catalog-client';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions
): Promise<Server> {
  const logger = options.logger.child({
    service: 'picpay-entity-provider-backend',
  });
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const discoveryApi = HostDiscovery.fromConfig(config);
  discoveryApi.getBaseUrl = () =>Promise.resolve(`${config.get('backend.baseUrl')}/api/catalog`);

  const catalogApi = new CatalogClient({ discoveryApi });
  const database = useHotMemoize(module, () => {
    return Knex({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
  });

  logger.debug('Starting application server...');
  const router = await createRouter({
    logger,
    config,
    database: await Database.create({ getClient: async () => database },{ getClient: async () => database }),
    catalogApi
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/entity-provider', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
