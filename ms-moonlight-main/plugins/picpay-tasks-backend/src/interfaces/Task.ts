import {
    SerializedTask,
    TaskStatus
} from '@backstage/plugin-scaffolder-node';

export type TasksStatus = {
    [key in TaskStatus]: {
        total: number,
        avgTime: number,
    }
}

export interface TaskRepository {
    getTasks(
        entityRef?: string,
        from?: Date,
        to?: Date,
        limit?: number,
        status?: TaskStatus | undefined,
        page?: number,
    ): Promise<{ tasks: SerializedTask[] }>
}

export interface TaskService {
    getExecutionNumbers(entityRef: string, from: Date, to: Date): Promise<{ [entityRef: string]: { [key in TaskStatus]: number } }>,
    getTasks(
        entityRef: string,
        limit: number,
        from?: Date,
        to?: Date,
        status?: TaskStatus | undefined,
        page?: number,
    ): Promise<{
        tasks: SerializedTask[],
        status: TasksStatus,
    }>
}