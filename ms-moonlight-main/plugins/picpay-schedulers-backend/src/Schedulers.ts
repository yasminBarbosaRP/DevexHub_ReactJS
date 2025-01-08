import { Config } from '@backstage/config';
import fetch from 'cross-fetch';
import { Logger } from 'winston';
import { PluginTaskScheduler } from '@backstage/backend-tasks';

type Task = {
  endpoint: string;
  name: string;
  method?: string;
  frequency?: number;
  headers?: Record<string, string>;
  body?: Record<string, string>;
};

type Options = {
  tasks: Task[];
  logger: Logger;
  config: Config;
  scheduler: PluginTaskScheduler;
};

export const schedulers = async ({
  tasks,
  scheduler,
  logger,
}: Options): Promise<void> => {
  for (const task of tasks) {
    logger.info(
      `Adding scheduler ${task.name} to hit:${task.endpoint} with method:${task.method}`,
    );
    const taskRunner = scheduler.createScheduledTaskRunner({
      frequency: {
        minutes: task.frequency || 30,
      },
      timeout: { minutes: 5 },
      initialDelay: { minutes: 1 }, // wait for the  backstage api to start
    });

    taskRunner.run({
      id: task.name,
      fn: async () => {
        const request = await fetch(task.endpoint, {
          method: task.method || 'POST',
          headers: {
            ...(task.headers || {}),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(task.body),
        });
        if (!request.ok) {
          logger.error(
            `failed to run task: ${task.name} with status:${
              request.statusText
            } and ${JSON.stringify(await request.text())}`,
          );
        } else {
          logger.info(
            `response: ${JSON.stringify(await request.text())}, status: ${
              request.statusText
            }`,
          );
        }
      },
    });
  }
};
