import TaskService from './TaskService';
import TaskRepository from '../repository/tasks'; // Adjust the import path as necessary
import { Knex } from 'knex'; // Import the type definition for Knex

// Create a mock Knex instance
const mockKnex = {} as Knex;

// Pass the mock Knex instance to the TaskRepository constructor
import { TasksStatus } from '../interfaces/Task'; // Adjust imports as necessary
import {
    SerializedTask,
} from '@backstage/plugin-scaffolder-node';

// Mock the TaskRepository
jest.mock('../repository/tasks'); // Adjust the import path as necessary

describe('TaskService', () => {
    let taskService: TaskService;
    let mockRepository: jest.Mocked<TaskRepository>;

    beforeEach(() => {
        // Setup mock repository
        mockRepository = new TaskRepository(mockKnex) as jest.Mocked<TaskRepository>;
        taskService = new TaskService(mockRepository);
    });

    test('getExecutionsNumbers returns correct execution numbers', async () => {
        // Assuming a more varied set of tasks in mockTasks for demonstration
        const mockTasksExtended: SerializedTask[] = [
            {
                id: '1',
                spec: {
                    apiVersion: 'scaffolder.backstage.io/v1beta3',
                    parameters: {},
                    steps: [],
                    output: {},
                    templateInfo: {
                        entityRef: 'testEntityRef'
                    }
                },
                status: 'completed',
                createdAt: '2024-01-01T00:00:00Z',
                lastHeartbeatAt: '2024-01-01T00:00:50Z',
            },
            {
                id: '2',
                spec: {
                    apiVersion: 'scaffolder.backstage.io/v1beta3',
                    parameters: {},
                    steps: [],
                    output: {},
                    templateInfo: {
                        entityRef: 'testEntityRef'
                    }
                },
                status: 'failed',
                createdAt: '2024-01-02T00:00:00Z',
                lastHeartbeatAt: '2024-01-02T00:00:50Z',
            },
            {
                id: '3',
                spec: {
                    apiVersion: 'scaffolder.backstage.io/v1beta3',
                    parameters: {},
                    steps: [],
                    output: {},
                    templateInfo: {
                        entityRef: 'testEntityRef'
                    }
                },
                status: 'open',
                createdAt: '2024-01-03T00:00:00Z',
                lastHeartbeatAt: '2024-01-03T00:00:50Z',
            }
        ];

        // Mock data for the method response
        const mockExecutionNumbers = {
            completed: 1,
            failed: 1,
            open: 1,
            processing: 0,
            cancelled: 0,
        };
        const entityRef = 'testEntityRef';

        // Mock the repository response
        mockRepository.getTasks.mockResolvedValueOnce({ tasks: mockTasksExtended });

        // Call the service method
        const from = new Date("2024-01-01T00:00:00Z")
        const to = new Date("2024-01-02T00:00:00Z")
        const result = await taskService.getExecutionNumbers("", from, to);

        // Assertions
        expect(result).toEqual({[entityRef]: mockExecutionNumbers});
        expect(mockRepository.getTasks).toHaveBeenCalledWith("", from, to);
    });

    test('getTasks successfully returns tasks and status', async () => {
        const mockTasks: SerializedTask[] = [
            // Example mock task
            {
                id: '1', spec: {
                    apiVersion: 'scaffolder.backstage.io/v1beta3',
                    parameters: {},
                    steps: [],
                    output: {}
                },
                status: 'completed',
                createdAt: '2024-01-01T00:00:00Z',
                lastHeartbeatAt: '2024-01-01T00:00:50Z',
            }];
        const mockStatus: TasksStatus = {
            cancelled: { total: 0, avgTime: 0 },
            completed: { total: 1, avgTime: 50 },
            failed: { total: 0, avgTime: 0 },
            open: { total: 0, avgTime: 0 },
            processing: { total: 0, avgTime: 0 }
        };
        const entityRef = 'testEntityRef';
        const limit = 10;
        const status = 'completed'; // Assuming TaskStatus is an enum or similar
        const page = 1;

        // Mock the repository response
        mockRepository.getTasks.mockResolvedValueOnce({ tasks: mockTasks, status: mockStatus } as { tasks: SerializedTask[], status: TasksStatus });

        // Call the service method
        const result = await taskService.getTasks(entityRef, limit, undefined, undefined, status, page);

        // Assertions
        expect(result.tasks).toEqual(mockTasks);
        expect(result.status).toEqual(mockStatus);
        expect(mockRepository.getTasks).toHaveBeenCalledWith(entityRef, undefined, undefined, limit, status, page);
    });
});