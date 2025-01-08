import { PassThrough } from 'stream';
import os from 'os';
import { getVoidLogger } from '@backstage/backend-common';
import fs from 'fs-extra';
import { readFileAction } from './readFile';

describe('moonlight:utils:fs:read-file', () => {
  const action = readFileAction();

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

  it('test output as string', async () => {
    fs.createFileSync(`${mockContext.workspacePath}/textFile.txt`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/textFile.txt`,
      'testOfTextFile',
    );
    await action.handler({
      ...mockContext,
      input: {
        path: './textFile.txt',
        outputFormat: 'object',
      },
    });
    expect(mockContext.output).toHaveBeenCalledWith('data', 'testOfTextFile');
  }, 20000);

  it('test output as object as txt', async () => {
    mockContext.output.mockImplementation((key, value) => {
      expect(key).toBe('data');
      expect(value.test).toBe('testOfobjectFile');
    });
    fs.createFileSync(`${mockContext.workspacePath}/objectFile.txt`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/objectFile.txt`,
      `{"test": "testOfobjectFile"}`,
    );
    await action.handler({
      ...mockContext,
      input: {
        path: './objectFile.txt',
        outputFormat: 'object',
      },
    });
    expect(mockContext.output).toHaveBeenCalledTimes(1);
  }, 20000);

  it('test output as object as json', async () => {
    mockContext.output.mockImplementation((key, value) => {
      expect(key).toBe('data');
      expect(value.test2).toBe('testOfobjectFile');
    });
    fs.createFileSync(`${mockContext.workspacePath}/objectFile.json`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/objectFile.json`,
      `{"test2": "testOfobjectFile"}`,
    );
    await action.handler({
      ...mockContext,
      input: {
        path: './objectFile.json',
        outputFormat: 'object',
      },
    });
    expect(mockContext.output).toHaveBeenCalledTimes(1);
  }, 20000);

  it('test output as object as yaml', async () => {
    mockContext.output.mockImplementation((key, value) => {
      expect(key).toBe('data');
      expect(value).not.toBeUndefined();
      expect(value).not.toBeNull();
      expect(value.test2).toBe('testOfobjectFile');
    });
    fs.createFileSync(`${mockContext.workspacePath}/objectFile.yaml`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/objectFile.yaml`,
      `test2: testOfobjectFile`,
    );
    await action.handler({
      ...mockContext,
      input: {
        path: './objectFile.yaml',
        outputFormat: 'object',
      },
    });
    expect(mockContext.output).toHaveBeenCalledTimes(1);
  }, 20000);

  it('test output as object as yaml by discovery', async () => {
    mockContext.output.mockImplementation((key, value) => {
      expect(key).toBe('data');
      expect(value).not.toBeUndefined();
      expect(value).not.toBeNull();
      expect(value.test2).toBe('testOfobjectFile');
    });
    fs.createFileSync(`${mockContext.workspacePath}/yamlFile.text`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/yamlFile.text`,
      `test2: testOfobjectFile`,
    );
    await action.handler({
      ...mockContext,
      input: {
        path: './yamlFile.text',
        outputFormat: 'object',
      },
    });
    expect(mockContext.output).toHaveBeenCalledTimes(1);
  }, 20000);

  it('error by enforcing wrong output', async () => {
    fs.createFileSync(`${mockContext.workspacePath}/wrongOutput.text`);
    fs.writeFileSync(
      `${mockContext.workspacePath}/wrongOutput.text`,
      `%%%%%1$$`,
    );
    let errorThrown = false;
    let errMsg: string = '';
    try {
      await action.handler({
        ...mockContext,
        input: {
          path: './wrongOutput.text',
          outputFormat: 'object',
        },
      });
    } catch (err: any) {
      errorThrown = true;
      errMsg = err.toString();
    } finally {
      expect(mockContext.output).toHaveBeenCalledTimes(0);
      expect(errorThrown).toBe(true);
      expect(errMsg).toContain('Unable to find file format');
    }
  }, 20000);
});
