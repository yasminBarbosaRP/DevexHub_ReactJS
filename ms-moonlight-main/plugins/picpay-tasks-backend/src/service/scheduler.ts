import { Knex } from "knex";
import { Logger } from "winston";
import { SchedulerService } from '@backstage/backend-plugin-api';
import TaskRepository from '../repository/tasks';
import TaskService from './TaskService';
import { metrics } from '@opentelemetry/api';
import { TaskStatus } from "@backstage/plugin-scaffolder-node";

type Options = {
    logger: Logger;
    scheduler: SchedulerService;
    database: Knex;
};
const FREQUENCY = Number(process.env.SCHEDULER_TASKS_WATCHER_FREQUENCY ?? 10);
const DELAY = Number(process.env.SCHEDULER_TASKS_WATCHER_DELAY ?? 1);

export const tasksWatcherScheduler = async ({
    scheduler,
    database,
}: Options): Promise<void> => {
    const repository = new TaskRepository(database);
    const service = new TaskService(repository);

    const taskRunner = scheduler.createScheduledTaskRunner({
        frequency: {
            minutes: FREQUENCY,
        },
        timeout: { minutes: 5 },
        initialDelay: { minutes: DELAY }, // wait for the  backstage api to start
    });

    taskRunner.run({
        id: 'taskWatcherScheduler',
        fn: async () => {
            const gauge = metrics.getMeter('default')
                .createObservableGauge('scaffolder.tasks.numbers', {
                    description: 'Number of tasks happening right now',
                })

            const from = new Date();
            const to = new Date();
            from.setMinutes(from.getMinutes() - (FREQUENCY + DELAY));

            const numbers: { [entityRef: string]: { [k in TaskStatus]: number }; } = await service.getExecutionNumbers("", from, to);
            gauge.addCallback(observable => {
                Object.keys(numbers).forEach(entityRef => {
                    Object.keys(numbers[entityRef]).forEach(status => {
                        observable.observe(numbers[entityRef][status as TaskStatus] as number, { entityRef, status });
                    });
                })
            })
        },
    });
};