import { Server } from 'http';
import { Logger } from 'winston';
import { createRouter } from './router';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { createServiceBuilder, loadBackendConfig } from '@backstage/backend-common';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'picpay-manage-template-version-backend' });
  const config = await loadBackendConfig({ logger, argv: process.argv });
  const integrations = ScmIntegrations.fromConfig(config);
  const githubCredentialsProvider = PicPayGithubCredentialsProvider.fromIntegrations(integrations);

  logger.debug('Starting application server...');
  const router = await createRouter({
    config,
    logger,
    integrations,
    githubCredentialsProvider,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/picpay-manage-template-version-backend', router);
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}

module.hot?.accept();