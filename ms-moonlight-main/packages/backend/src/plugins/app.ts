import { createRouter } from '@backstage/plugin-app-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';

export default async function createPlugin({
  logger,
  config,
  database,
}: PluginEnvironment): Promise<Router> {
  return createRouter({
    logger,
    config,
    database,
    appPackageName: 'app',
  });
}
