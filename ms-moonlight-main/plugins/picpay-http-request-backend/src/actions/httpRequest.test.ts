import { PassThrough } from 'stream';
import os from 'os';
import { getVoidLogger } from '@backstage/backend-common';
import { httpRequestAction } from './httpRequest';
import axios from 'axios';
import axiosRetry from 'axios-retry'; // Add this import

jest.mock('axios');
jest.mock('axios-retry'); // Mock axiosRetry

describe('moonlight:http-request', () => {
    const action = httpRequestAction();

    const mockContext = {
        workspacePath: os.tmpdir(),
        logger: getVoidLogger(),
        logStream: new PassThrough(),
        output: jest.fn(),
        createTemporaryDirectory: jest.fn(),
        getInitiatorCredentials: jest.fn(),
        checkpoint: jest.fn(),
    };

    beforeEach(() => {
        jest.resetAllMocks();
        (axiosRetry as unknown as jest.Mock).mockImplementation(() => { }); // Mock axiosRetry to do nothing
    });

    it('test body as string', async () => {
        const client = jest.fn().mockResolvedValue({ data: { test: 123 }, status: 200 }); // Ensure client is a mock function
        (axios.create as jest.Mock).mockReturnValue(client); // Use mockReturnValue instead of mockResolvedValue
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_body');
            expect(value.test).toBe(123);
        });
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_status_code');
            expect(value).toBe(200);
        });
        await action.handler({
            ...mockContext,
            input: {
                body: "testing",
                url: 'testing',
                method: 'get',
                throwOutput: true
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(2);
    }, 20000);

    it('test body as string fixing break of lines', async () => {
        const client = jest.fn().mockResolvedValue({ data: { test: 123 }, status: 200 }); // Ensure client is a mock function
        (axios.create as jest.Mock).mockReturnValue(client); // Use mockReturnValue instead of mockResolvedValue
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_body');
            expect(value.test).toBe(123);
        });
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_status_code');
            expect(value).toBe(200);
        });
        await action.handler({
            ...mockContext,
            input: {
                body: "metadata:\\n  name: squad-atlantis\\n  namespace: picpay\\nspec:\\n  type: squad\\n  leadRef: user:picpay/cleber-mendes\\nkind: Group\\n\\n---\\nkind: Group\\nmetadata:\\n  name: skill-golang\\n  description: testing somethings\\n  links: []\\n  namespace: default\\nspec:\\n  type: chapter\\n  members:\\n    - user:picpay/cleber-mendes\\n",
                url: 'testing',
                method: 'get',
                throwOutput: true
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(2);
        expect(client).toHaveBeenCalledWith(expect.objectContaining({
            data: "metadata:\n  name: squad-atlantis\n  namespace: picpay\nspec:\n  type: squad\n  leadRef: user:picpay/cleber-mendes\nkind: Group\n\n---\nkind: Group\nmetadata:\n  name: skill-golang\n  description: testing somethings\n  links: []\n  namespace: default\nspec:\n  type: chapter\n  members:\n    - user:picpay/cleber-mendes\n",
            headers: { "Content-Type": "application/json" },
            method: "get",
            url: "testing"
        }))
    }, 20000);

    it('use env as header', async () => {
        process.env.TESTING = "abcd";
        const client = jest.fn().mockResolvedValue({ data: { test: 123 }, status: 200 }); // Ensure client is a mock function
        (axios.create as jest.Mock).mockReturnValue(client); // Use mockReturnValue instead of mockResolvedValue
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_body');
            expect(value.test).toBe(123);
        });
        mockContext.output.mockImplementationOnce((key, value) => {
            expect(key).toBe('response_status_code');
            expect(value).toBe(200);
        });
        await action.handler({
            ...mockContext,
            input: {
                environments: [
                    {
                        where: 'body',
                        envName: 'TESTING',
                        key: 'TESTING'
                    }
                ],
                body: { my_test: "testing" },
                url: 'testing',
                method: 'get',
                throwOutput: true
            },
        });
        expect(client).toHaveBeenCalledWith(expect.objectContaining({
            data: JSON.stringify({ my_test: "testing", TESTING: 'abcd' }),
        }));
        expect(mockContext.output).toHaveBeenCalledTimes(2);
    }, 20000);

    it('test body as string, but asking for env in body', async () => {
        process.env.TESTING = "abcd";

        await expect(
            action.handler({
                ...mockContext,
                input: {
                    environments: [
                        {
                            where: 'body',
                            envName: 'TESTING',
                            key: 'TESTING'
                        }
                    ],
                    body: "testing",
                    url: 'testing',
                    method: 'get',
                    throwOutput: true
                },
            })
        ).rejects.toThrow('To set an environment on body, it must be an object');
    }, 20000);
});
