import {
  createRouter,
  DatabaseQetaStore,
} from '@drodil/backstage-plugin-qeta-backend';
import { PluginEnvironment } from '../types';

export default async function createPlugin({
  logger,
  database,
  identity,
  config,
  tokenManager,
  permissions,
}: PluginEnvironment) {
  const db = await DatabaseQetaStore.create({
    database: database,
  });

  return createRouter({
    identity,
    database: db,
    logger,
    config,
    tokenManager,
    permissions,
  });
}