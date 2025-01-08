import { getRootLogger, loadBackendConfig } from '@backstage/backend-common';
import { schedulers } from './Schedulers';
import {
  PluginTaskScheduler,
  TaskInvocationDefinition,
  TaskRunner,
} from '@backstage/backend-tasks';

class PersistingTaskRunner implements TaskRunner {
  private tasks: TaskInvocationDefinition[] = [];

  getTasks() {
    return this.tasks;
  }

  run(task: TaskInvocationDefinition): Promise<void> {
    this.tasks.push(task);
    return Promise.resolve(undefined);
  }
}

const logger = getRootLogger();
const config = await loadBackendConfig({ logger, argv: process.argv });

const schedule = new PersistingTaskRunner();
const scheduler = {
  createScheduledTaskRunner: (_: any) => schedule,
} as unknown as PluginTaskScheduler;

schedulers({
  tasks: [
    {
      name: 'test',
      endpoint: `${config.getString(
        'backend.baseUrl',
      )}/cluster-migration/status-switcher/run`,
      method: 'POST',
    },
  ],
  config,
  scheduler: scheduler,
  logger,
});

process.on('SIGINT', () => {
  logger.info('CTRL+C pressed; exiting.');
  process.exit(0);
});
