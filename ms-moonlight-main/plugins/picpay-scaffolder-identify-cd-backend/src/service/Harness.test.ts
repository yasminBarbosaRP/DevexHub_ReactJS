import { PassThrough } from 'stream';
import os from 'os';
import got from 'got';
import { getVoidLogger } from '@backstage/backend-common';
import { Harness } from './Harness';

jest.mock('./Harness');

const mockGot = got as jest.Mocked<typeof got>;

describe('Harness Class', () => {
  let harness: Harness;

  const mockContext = {
    workspacePath: os.tmpdir(),
    logger: getVoidLogger(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
  };

  beforeEach(() => {
    harness = new Harness('ms-test', mockContext.logger, mockGot);

    jest.resetAllMocks();
  });

  it('Should be defined', () => {
    expect(harness).toBeDefined();
  });

  it('It`s an instance of Class Harness', () => {
    expect(harness).toBeInstanceOf(Harness);
  });
});
