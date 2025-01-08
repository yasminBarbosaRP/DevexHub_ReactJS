import { createApiRef, ConfigApi } from '@backstage/core-plugin-api';
import { parseEntityRef } from '@backstage/catalog-model';
import { TasksStatus, SerializedTask } from '@internal/plugin-picpay-tasks-backend';

type Tasks = {
    getByEntityRef(entityRef: string, page: number, from: Date | undefined, to: Date | undefined): Promise<{
        tasks: SerializedTask[]; status: TasksStatus
    }>;
};

type Options = {
    configApi: ConfigApi;
};

export const tasksApiRef = createApiRef<Tasks>({
    id: 'tasks-api',
});

export class TasksClient implements Tasks {
    configApi: ConfigApi;

    constructor(options: Options) {
        this.configApi = options.configApi;
    }
    async getByEntityRef(entityRef: string, page: number = 1, from: Date | undefined, to: Date | undefined): Promise<{
        tasks: SerializedTask[]; status: TasksStatus
    }> {
        const { kind, namespace, name } = parseEntityRef(entityRef)
        const response = await this.fetch<{ data: { tasks: SerializedTask[]; status: TasksStatus } }>(
            `/api/scaffolder/v2/tasks/details/${kind}/${namespace}/${name}?page=${page}&from=${from?.toISOString()}&to=${to?.toISOString()}`,
        );
        return Promise.resolve(response.data);
    }

    private async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
        const url = this.configApi.getString('backend.baseUrl');
        const response = await fetch(`${url}${input}`, {
            headers: {
                Accept: 'application/json',
                'Content-Type': 'application/json',
            },
            ...init,
        });

        if (!response.ok) {
            throw new Error(
                response.statusText ||
                'Catalog Component Report - An unexpected error occurred.',
            );
        }

        return await response.json();
    }
}
