import { DatabaseManager, createServiceBuilder, loadBackendConfig } from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'picpay-tasks-backend' });
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const database = DatabaseManager.fromConfig(config, {
    logger: logger.child({ type: 'database' }),
  });
  
  logger.debug('Starting application server...');
  const router = await createRouter({
    logger,
    database: await database.forPlugin('scaffolder').getClient(),
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/picpay-tasks', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}