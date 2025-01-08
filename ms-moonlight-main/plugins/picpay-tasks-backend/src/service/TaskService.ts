import { SerializedTask, TaskStatus } from "@backstage/plugin-scaffolder-node";
import { TaskService, TasksStatus } from "../interfaces/Task";
import TaskRepository from "../repository/tasks";

export default class TaskServiceImpl implements TaskService {
    /**
     *
     */
    constructor(readonly repository: TaskRepository) {
    }

    async getExecutionNumbers(entityRef: string, from: Date, to: Date): Promise<{ [entityRef: string]: { [key in TaskStatus]: number; } }> {
        const tasks = await this.repository.getTasks(entityRef ?? undefined, from, to);
        const result: { [entityRef: string]: { [k in TaskStatus]: number }; } = {}
        tasks.tasks.forEach(task => {
            if (task.spec.templateInfo?.entityRef === undefined) return;
            if (!result[task.spec.templateInfo?.entityRef]) {
                result[task.spec.templateInfo?.entityRef] = {
                    cancelled: 0,
                    completed: 0,
                    failed: 0,
                    open: 0,
                    processing: 0
                }
            }
            result[task.spec.templateInfo?.entityRef][task.status] += 1;
        });
        return Promise.resolve(result);
    }

    async getTasks(entityRef: string, limit: number, from?: Date, to?: Date, status?: TaskStatus | undefined, page?: number | undefined): Promise<{ tasks: SerializedTask[]; status: TasksStatus }> {
        const tasks = await this.repository.getTasks(entityRef, from, to, limit, status, page);

        const statusData: TasksStatus = {
            cancelled: {
                total: 0,
                avgTime: 0
            },
            completed: {
                total: 0,
                avgTime: 0
            },
            failed: {
                total: 0,
                avgTime: 0
            },
            open: {
                total: 0,
                avgTime: 0
            },
            processing: {
                total: 0,
                avgTime: 0
            }
        };

        const totalTime: {[k: string]: number} = {};
        const result = tasks.tasks.map(task => {
            if (!statusData[task.status]) {
                statusData[task.status] = {
                    total: 0,
                    avgTime: 0,
                }
            }
            if (statusData[task.status]) {
                statusData[task.status] = {
                    // @ts-ignore
                    total: statusData[task.status]?.total + 1,
                    avgTime: 0
                }
                if (!totalTime[task.status]) {
                    totalTime[task.status] = (new Date(task.lastHeartbeatAt ?? 0).getTime() - new Date(task.createdAt ?? 0).getTime()) / 1000;
                } else {
                    totalTime[task.status] += (new Date(task.lastHeartbeatAt ?? 0).getTime() - new Date(task.createdAt ?? 0).getTime()) / 1000;
                }
            }

            return task;
        });

        for (const key in statusData) {
            // @ts-ignore
            if (statusData[key].total > 0) {
                // @ts-ignore
                statusData[key].avgTime = totalTime[key] / statusData[key].total;
            }
        }

        return Promise.resolve({ tasks: result, status: statusData })
    }


}