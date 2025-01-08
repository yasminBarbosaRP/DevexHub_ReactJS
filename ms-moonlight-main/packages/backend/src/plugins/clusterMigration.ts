import { createRouter } from '@internal/plugin-picpay-cluster-migration-backend';
import { getPodCountByPhase } from '@internal/plugin-picpay-scaffolder-k8s-backend';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment) {
  return createRouter({
    config: env.config,
    logger: env.logger,
    getPodCountByPhase,
  });
}
