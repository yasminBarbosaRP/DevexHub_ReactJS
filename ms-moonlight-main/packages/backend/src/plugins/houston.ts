import { createRouter } from '@internal/plugin-picpay-houston-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return createRouter({
    config: env.config,
    logger: env.logger,
  });
}
