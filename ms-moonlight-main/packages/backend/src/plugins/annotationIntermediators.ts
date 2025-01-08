import { createRouter } from '@internal/plugin-picpay-annotation-intermediator-backend';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment) {
  return createRouter({
    config: env.config,
    logger: env.logger,
    database: env.database,
  });
}
