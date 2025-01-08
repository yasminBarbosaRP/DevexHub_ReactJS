import { schedulers } from '@internal/plugin-picpay-schedulers-backend';
import {
  removeProblematicLocationsScheduler,
  removeOrphansScheduler,
} from '@internal/plugin-picpay-entity-cleanup-backend';
import { tasksWatcherScheduler } from '@internal/plugin-picpay-tasks-backend';
import type { PluginEnvironment } from '../types';

export async function httpSchedulers({
  logger,
  config,
  scheduler,
}: PluginEnvironment): Promise<void> {
  return await schedulers({
    tasks: [
      {
        name: 'clusterMigrationStatusSwitcherScheduler',
        endpoint: `${config.getString(
          'backend.baseUrl',
        )}/api/cluster-migration/status-switcher/run`,
        method: 'POST',
      },
    ],
    logger,
    config,
    scheduler,
  });
}

export async function scheduleOrphanRemovals({
  logger,
  config,
  scheduler,
}: PluginEnvironment): Promise<void> {
  return await removeOrphansScheduler({
    logger,
    config,
    scheduler,
  });
}

export async function problematicLocationScheduler({
  logger,
  config,
  scheduler,
}: PluginEnvironment): Promise<void> {
  return await removeProblematicLocationsScheduler({
    scheduler,
    logger,
    config,
  });
}

export async function scheduleTaskWatcher({
  logger,
  scheduler,
  database,
}: PluginEnvironment): Promise<void> {
  return await tasksWatcherScheduler({
    logger,
    scheduler,
    database: await database.getClient(),
  });
}
