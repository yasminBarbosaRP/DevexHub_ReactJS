import {
  createServiceBuilder,
  loadBackendConfig,
  useHotMemoize,
} from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import { DatabaseApiProxy } from '../database/ApiProxyRepository';
import Knex from 'knex';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({
    service: 'picpay-api-docs-proxy-backend',
  });
  const config = await loadBackendConfig({ logger, argv: process.argv });

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
    database: await DatabaseApiProxy.create({
      database: {
        getClient: async () => {
          return database;
        },
      },
    }),
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/picpay-api-docs-proxy', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
