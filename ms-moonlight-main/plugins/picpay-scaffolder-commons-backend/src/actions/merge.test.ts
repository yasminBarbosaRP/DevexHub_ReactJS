import os from 'os';
import { PassThrough } from 'stream';
import { getVoidLogger } from '@backstage/backend-common';
import { createJsonMergeAction } from './merge';

describe('moonlight:json:merge', () => {
    const mockContext: any = {
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

    const action = createJsonMergeAction();

    it('merges two distinct objects', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value).toEqual({ abc: "test1", test: 2 });
        });

        await action.handler({
            ...mockContext,
            input: {
                source: { abc: "test1" },
                destination: { test: 2 },
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('source prevails on key conflict', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value).toEqual({ abc: "test1" });
        });

        await action.handler({
            ...mockContext,
            input: {
                source: { abc: "test1" },
                destination: { abc: 2 },
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('deep merges nested objects with source prevailing', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value).toEqual({ abc: { name: "bruno", surname: "rodrigues" } });
        });

        await action.handler({
            ...mockContext,
            input: {
                source: { abc: { name: "bruno" } },
                destination: { abc: { surname: "rodrigues" } },
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('replaces matching array element by replaceWithKey', async () => {

        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value).toEqual([
                { abc: { name: "bruno" } },
                { abc: { name: "cleber" } }
            ]);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [{ abc: { name: "bruno" } }],
                destination: [
                    { abc: { name: "bruno", surname: "rodrigues" } },
                    { abc: { name: "cleber" } }
                ],
                replaceWithKey: "abc.name",
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('simple string inputs', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value).toEqual({ abc: 1, test: "xyz" });
        });

        await action.handler({
            ...mockContext,
            input: {
                source: '{"abc":1}',
                destination: '{"abc":2,"test":"xyz"}',
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('arrays of entity merge', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis")).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}}],
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}}],
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    
    it('arrays of entity merge with replaceWithKey but no key in the destination', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis")).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}}],
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}}],
                replaceWithKey: "metadata.name"
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('arrays of entity merge with replaceWithKey replace the object from destination due replaceWithKey option', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis").length).toBe(1);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis").spec.leadRef).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad","leadRef":"user:picpay/cleber-mendes"}}],
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}}],
                replaceWithKey: "metadata.name"
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('merge source as object to an array destination with no replaceWitKey', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis").length).toBe(2);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis" && e.spec.leadRef !== undefined)).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis" && !e.spec.leadRef)).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: {"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad","leadRef":"user:picpay/cleber-mendes"}},
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}}],
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('merge source as object to an array destination', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis").length).toBe(1);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-atlantis").spec.leadRef).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: {"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad","leadRef":"user:picpay/cleber-mendes"}},
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}}],
                replaceWithKey: "metadata.name"
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('arrays of entity merge with replaceWithKey replace the object from destination due replaceWithKey option and duplicated objected in destination', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.find((e:any) => e.metadata.name === "squad-cicd")).not.toBe(undefined);
            expect(value.find((e:any) => e.metadata.name === "squad-devup")).not.toBe(undefined);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis").length).toBe(2);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis")[0].spec.leadRef).not.toBe(undefined);
            expect(value.filter((e:any) => e.metadata.name === "squad-atlantis")[1].spec.leadRef).not.toBe(undefined);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad","leadRef":"user:picpay/cleber-mendes"}}],
                destination: [{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-cicd"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-devup"}, "spec": {"type":"squad"}},{"apiVersion":"backstage.io/v1beta1","kind":"Group","metadata":{"name":"squad-atlantis"}, "spec": {"type":"squad"}}],
                replaceWithKey: "metadata.name"
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });


    it('arrays without replaceWithKey just get replaced by source', async () => {
        mockContext.output.mockImplementation((key: any, value: any) => {
            expect(key).toBe('result');
            expect(value.includes(1)).toEqual(true);
            expect(value.includes(2)).toEqual(true);
            expect(value.includes(3)).toEqual(true);
            expect(value.includes(4)).toEqual(true);
            expect(value.includes(5)).toEqual(true);
            expect(value.includes(6)).toEqual(true);
        });

        await action.handler({
            ...mockContext,
            input: {
                source: [1, 2, 3],
                destination: [4, 5, 6],
            },
        });
        expect(mockContext.output).toHaveBeenCalledTimes(1);
    });

    it('fail on invalid json string', async () => {
        await expect(action.handler({
            ...mockContext,
            input: {
                source: '{"abc":1}',
                destination: '{"abc":2', // Missing closing brace
            },
        })).rejects.toThrow(`Failed to parse input data: Expected ',' or '}' after property value in JSON at position 8`);
    });
});
