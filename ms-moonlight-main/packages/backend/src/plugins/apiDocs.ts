import { createRouter } from '@internal/plugin-picpay-api-docs-proxy-backend';
import { PluginEnvironment } from '../types';
import { DatabaseApiProxy } from '@internal/plugin-picpay-api-docs-proxy-backend';

export default async function createPlugin(env: PluginEnvironment) {
  return createRouter({
    logger: env.logger,
    config: env.config,
    database: await DatabaseApiProxy.create({ database: env.database }),
  });
}
