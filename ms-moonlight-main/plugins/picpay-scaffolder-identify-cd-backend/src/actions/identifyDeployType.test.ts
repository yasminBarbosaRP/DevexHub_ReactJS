import { PassThrough } from 'stream';
import os from 'os';
import { getVoidLogger } from '@backstage/backend-common';
import got from 'got';
import { identifyDeployTypeAction } from './identifyDeployType';
import { Argocd } from '../service/';

jest.mock('../service/Argocd');
jest.mock('../service/Harness');

const mockGot = got as jest.Mocked<typeof got>;

describe('moonlight:identify-deploy-type', () => {
  const action = identifyDeployTypeAction(mockGot);

  const mockContext = {
    workspacePath: os.tmpdir(),
    logger: getVoidLogger(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    getInitiatorCredentials: jest.fn(),
    checkpoint: jest.fn(),
  };
  let argocd: Argocd;

  beforeEach(() => {
    argocd = new Argocd('ms-test', mockContext.logger, mockGot);

    jest.clearAllMocks();
  });

  it('Should call ArgoCd Auth', async () => {
    const authSpy = jest.spyOn(argocd, 'auth');
    await argocd.auth();

    await action.handler({
      ...mockContext,
      input: {
        serviceName: 'ms-moonlight',
      },
    });

    expect(authSpy).toHaveBeenCalled();
    expect(authSpy).toHaveBeenCalledTimes(1);
  });
});
