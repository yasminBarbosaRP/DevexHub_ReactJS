import { PassThrough } from 'stream';
import os from 'os';
import { getVoidLogger } from '@backstage/backend-common';
import { createJsonParseAction, createYamlParseAction } from './parse';

describe('parse.ts', () => {

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
    });


    describe('moonlight:yaml:parse', () => {
        const action = createYamlParseAction();

        it('simple object', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain("test: 123");
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: "{\"test\":123}",
                    toJSON: false,
                    toMultipleObjects: false
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);


        it('already an object', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain("test: 123");
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: { "test": 123 },
                    toJSON: false,
                    toMultipleObjects: false
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);

        it('test array convertion', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain("- test: 123");
                expect(value).toContain("- test: 456");
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: "[{\"test\":123},{\"test\":456}]",
                    toJSON: false,
                    toMultipleObjects: false
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);


        it('test wierd array with string and objects', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain("- test: 123");
                expect(value).toContain("- test: 456");
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: ["{\"test\":123}", { "test": 456 }],
                    toJSON: false,
                    toMultipleObjects: false
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);


        it('test exception', async () => {
            await expect(action.handler({
                ...mockContext,
                input: {
                    data: ["{\"test:123}", { "test": 456 }],
                    toJSON: false,
                    toMultipleObjects: false
                },
            })).rejects.toThrow();
        }, 20000);

        it('test array conversion with toMultipleObjects', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain('test: 123');
                expect(value).toContain('---');
                expect(value).toContain('test: 456');
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: "[{\"test\":123},{\"test\":456}]",
                    toJSON: false,
                    toMultipleObjects: true
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);

        it('test array with string and objects with toMultipleObjects', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContain('test: 123');
                expect(value).toContain('---');
                expect(value).toContain('test: 456');
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: ["{\"test\":123}", { "test": 456 }],
                    toJSON: false,
                    toMultipleObjects: true
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);
    });

    describe('moonlight:json:parse', () => {
        const action = createJsonParseAction();

        it('simple object', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value.test).toBe(123);
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: "{\"test\":123}",
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);


        it('already an object', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value.test).toBe(123);
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: { "test": 123 },
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);

        it('test array convertion', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContainEqual({ test: 123 });
                expect(value).toContainEqual({ test: 456 });
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: "[{\"test\":123},{\"test\":456}]",
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);

        it('test wierd array with string and objects', async () => {
            mockContext.output.mockImplementationOnce((key, value) => {
                expect(key).toBe('result');
                expect(value).toContainEqual({ test: 123 });
                expect(value).toContainEqual({ test: 456 });
            });
            await action.handler({
                ...mockContext,
                input: {
                    data: ["{\"test\":123}", { "test": 456 }],
                },
            });
            expect(mockContext.output).toHaveBeenCalledTimes(1);
        }, 20000);


        it('test exception', async () => {
            await expect(action.handler({
                ...mockContext,
                input: {
                    data: ["{\"test:123}", { "test": 456 }],
                },
            })).rejects.toThrow('Failed to parse data: Unterminated string in JSON at position 11');
        }, 20000);
    })
});

