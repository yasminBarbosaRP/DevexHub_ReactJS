import {
  buildAnnouncementsContext,
  createRouter,
} from '@internal/plugin-picpay-announcements-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

export default async function createPlugin({
  config,
  logger,
  database,
  permissions,
}: PluginEnvironment): Promise<Router> {
  const integrations = ScmIntegrations.fromConfig(config);
  const githubCredentialsProvider =
    PicPayGithubCredentialsProvider.fromIntegrations(integrations);

  const announcementsContext = await buildAnnouncementsContext({
    config: config,
    logger: logger,
    database: database,
    permissions: permissions,
    githubCredentialsProvider: githubCredentialsProvider,
  });

  return await createRouter(announcementsContext);
}
