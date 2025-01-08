import {
  createServiceBuilder,
  loadBackendConfig,
  SingleHostDiscovery,
} from '@backstage/backend-common';
import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import { CatalogClient } from '@backstage/catalog-client';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions
): Promise<Server> {
  const logger = options.logger.child({ service: 'picpay-metrics-backend' });
  const config = await loadBackendConfig({ logger, argv: process.argv });
  logger.debug('Starting application server...');
  
  const discoveryApi = SingleHostDiscovery.fromConfig(config);
  discoveryApi.getBaseUrl = () =>
    Promise.resolve(`${config.get('backend.baseUrl')}/api/catalog`);
  const catalogApi = new CatalogClient({ discoveryApi });

  const router = await createRouter({
    logger,
    config,
    catalogApi,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/picpay-metrics', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();
