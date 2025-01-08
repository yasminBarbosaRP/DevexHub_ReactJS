import { PassThrough } from 'stream';
import os from 'os';
import got from 'got';
import { getVoidLogger } from '@backstage/backend-common';
import { Argocd } from './Argocd';

jest.mock('./Argocd');
const mockGot = got as jest.Mocked<typeof got>;

describe('ArgoCd Class', () => {
  let argocd: Argocd;

  const mockContext = {
    workspacePath: os.tmpdir(),
    logger: getVoidLogger(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
  };

  beforeEach(() => {
    argocd = new Argocd('ms-test', mockContext.logger, mockGot);

    jest.resetAllMocks();
  });

  it('Should be defined', () => {
    expect(argocd).toBeDefined();
  });

  it('It`s an instance of ArgoCd Class', () => {
    expect(argocd).toBeInstanceOf(Argocd);
  });

  it('Should Call Argo Auth value', async () => {
    const authSpy = jest.spyOn(argocd, 'auth');
    await argocd.auth();

    expect(authSpy).toHaveBeenCalled();
    expect(authSpy).toHaveBeenCalledTimes(1);
  });
});
