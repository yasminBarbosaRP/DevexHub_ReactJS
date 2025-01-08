import { createRouter } from '@internal/plugin-picpay-github-users-backend';
import {
  UsersRepository,
  GroupsRepository,
} from '@internal/plugin-picpay-github-users-backend';
import { PluginEnvironment } from '../types';
import { ConfigApi } from '@backstage/core-plugin-api';
import { CatalogClient } from '@backstage/catalog-client';

export default async function createPlugin(
  config: ConfigApi,
  env: PluginEnvironment,
) {
  const catalogApi = new CatalogClient({ discoveryApi: env.discovery });
  return createRouter({
    config,
    logger: env.logger,
    catalog: catalogApi,
    userRepository: new UsersRepository(config),
    groupsRepository: new GroupsRepository(config),
  });
}
