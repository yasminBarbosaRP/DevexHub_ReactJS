import { createStatusCheckRouter } from '@backstage/backend-common';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  return await createStatusCheckRouter({
    logger: env.logger,
    path: '/healthcheck',
  });
}
