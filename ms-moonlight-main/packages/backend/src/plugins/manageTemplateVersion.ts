import { createRouter } from '@internal/plugin-picpay-manage-template-version-backend';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { PluginEnvironment } from '../types';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

export default async function createPlugin(env: PluginEnvironment) {
  const config = env.config;
  const integrations = ScmIntegrations.fromConfig(config);
  const githubCredentialsProvider = PicPayGithubCredentialsProvider.fromIntegrations(integrations);

  return createRouter({
    config: env.config,
    logger: env.logger,
    integrations,
    githubCredentialsProvider,
  });
}