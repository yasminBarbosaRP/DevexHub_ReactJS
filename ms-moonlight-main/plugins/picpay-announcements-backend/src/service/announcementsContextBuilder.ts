import { Logger } from 'winston';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { PermissionEvaluator } from '@backstage/plugin-permission-common';
import {
  initializePersistenceContext,
  PersistenceContext,
} from './persistence/persistenceContext';
import { GithubCredentialsProvider } from '@backstage/integration';
import GithubAPI from './api/GithubAPI';
import { Config } from '@backstage/config';

export type AnnouncementsContextOptions = {
  config: Config;
  logger: Logger;
  database: PluginDatabaseManager;
  permissions: PermissionEvaluator;
  githubCredentialsProvider: GithubCredentialsProvider;
};

export type AnnouncementsContext = {
  logger: Logger;
  persistenceContext: PersistenceContext;
  permissions: PermissionEvaluator;
  githubAPI?: GithubAPI;
};

export const buildAnnouncementsContext = async ({
  config,
  logger,
  database,
  permissions,
  githubCredentialsProvider,
}: AnnouncementsContextOptions): Promise<AnnouncementsContext> => {
  const persistenceContext = await initializePersistenceContext(database);

  const githubIntegration = config.getBoolean(
    'announcements.githubIntegration',
  );

  return {
    logger: logger,
    persistenceContext: persistenceContext,
    permissions: permissions,
    githubAPI: githubIntegration
      ? new GithubAPI(config, persistenceContext, githubCredentialsProvider)
      : undefined,
  };
};
