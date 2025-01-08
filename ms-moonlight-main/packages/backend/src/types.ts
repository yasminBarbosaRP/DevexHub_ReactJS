import { Logger } from 'winston';
import { Config } from '@backstage/config';
import {
  PluginCacheManager,
  PluginDatabaseManager,
  PluginEndpointDiscovery,
  TokenManager,
  UrlReader,
} from '@backstage/backend-common';
import { PluginTaskScheduler } from '@backstage/backend-tasks';
import { IdentityApi } from '@backstage/plugin-auth-node';
import { PermissionEvaluator } from '@backstage/plugin-permission-common';
import { EventBroker, EventsService } from '@backstage/plugin-events-node';
import { SignalsService } from '@backstage/plugin-signals-node';

export type PluginEnvironment = {
  logger: Logger;
  cache: PluginCacheManager;
  database: PluginDatabaseManager;
  config: Config;
  reader: UrlReader;
  discovery: PluginEndpointDiscovery;
  tokenManager: TokenManager;
  permissions: PermissionEvaluator;
  scheduler: PluginTaskScheduler;
  identity: IdentityApi;
  events: EventsService;
  signals: SignalsService;
  /**
 * @deprecated use `events` instead
 */
  eventBroker?: EventBroker;
};
