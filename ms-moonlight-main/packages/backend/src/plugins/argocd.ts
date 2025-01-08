import { createRouter } from '@internal/plugin-picpay-argocd-backend';
import { ArgoCDRepository } from '@internal/plugin-picpay-argocd-backend';
import { PluginEnvironment } from '../types';
import { ConfigApi } from '@backstage/core-plugin-api';

export default async function createPlugin(
  config: ConfigApi,
  env: PluginEnvironment,
) {
  return createRouter({
    logger: env.logger,
    repo: new ArgoCDRepository(config, env.logger),
  });
}
