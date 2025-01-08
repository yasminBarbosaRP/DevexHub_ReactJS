import { PassThrough } from 'stream';
import os from 'os';
import { getVoidLogger } from '@backstage/backend-common';
import { ConfigReader } from '@backstage/config';
import {
  ScmIntegrations,
  DefaultGithubCredentialsProvider,
} from '@backstage/integration';
import { pushToBranchAction } from './push-to-branch';

describe('push-to-branch', () => {
  const integrations = ScmIntegrations.fromConfig(
    new ConfigReader({
      integrations: {
        github: [{ host: 'github.com', token: 'token' }],
      },
    }),
  );

  const pushToBranchFnMock = jest.fn();
  const createPullRequestFnMock = jest.fn();

  const githubCredentialsProvider =
    DefaultGithubCredentialsProvider.fromIntegrations(integrations);

  const action = pushToBranchAction(
    integrations,
    githubCredentialsProvider,
    pushToBranchFnMock,
    createPullRequestFnMock,
  );

  const mockContext = {
    workspacePath: os.tmpdir(),
    logger: getVoidLogger(),
    logStream: new PassThrough(),
    output: jest.fn(),
    createTemporaryDirectory: jest.fn(),
    getInitiatorCredentials: jest.fn(),
    checkpoint: jest.fn()
  };

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('test default funcs', async () => {
    const actionWithoutFns = pushToBranchAction(
      integrations,
      githubCredentialsProvider,
    );

    let errorThrown = false;
    try {
      await actionWithoutFns.handler({
        ...mockContext,
        input: {
          repo: 'ms-moonlight',
          cwd: './repo',
          paths: [],
          targetBranch: 'main',
          commitMsg: 'test',
          pullRequest: {
            description: 'testing description',
            title: 'title of pr',
          },
        },
      });
    } catch (err) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  }, 20000);

  it('test throw same branch on prs', async () => {
    const actionWithoutFns = pushToBranchAction(
      integrations,
      githubCredentialsProvider,
    );

    let errorThrown = false;
    try {
      await actionWithoutFns.handler({
        ...mockContext,
        input: {
          repo: 'ms-moonlight',
          cwd: './repo',
          paths: [],
          baseBranch: 'main',
          targetBranch: 'main',
          commitMsg: 'test',
          pullRequest: {
            description: 'testing description',
            title: 'title of pr',
          },
        },
      });
    } catch (err) {
      errorThrown = true;
    }

    expect(errorThrown).toBe(true);
  }, 20000);

  it('test calling pull request mock', async () => {
    createPullRequestFnMock.mockReturnValue(
      Promise.resolve({ url: 'http://test.api', number: 32 }),
    );
    await action.handler({
      ...mockContext,
      input: {
        repo: 'ms-moonlight',
        cwd: './repo',
        paths: [],
        targetBranch: 'main',
        commitMsg: 'test',
        pullRequest: {
          description: 'testing description',
          title: 'title of pr',
        },
      },
    });

    expect(createPullRequestFnMock).toHaveBeenCalled();
    expect(pushToBranchFnMock).toHaveBeenCalled();
  }, 20000);

  it('test calling only push to branch mock', async () => {
    pushToBranchFnMock.mockReturnValue(Promise.resolve());
    await action.handler({
      ...mockContext,
      input: {
        repo: 'ms-moonlight',
        cwd: './repo',
        paths: [],
        targetBranch: 'main',
        commitMsg: 'test',
      },
    });

    expect(createPullRequestFnMock).toHaveBeenCalledTimes(0);
    expect(pushToBranchFnMock).toHaveBeenCalled();
  }, 20000);

  it('test pull request output', async () => {
    createPullRequestFnMock.mockReturnValue(
      Promise.resolve({ url: 'http://test.api', number: 32 }),
    );
    await action.handler({
      ...mockContext,
      input: {
        repo: 'ms-moonlight',
        cwd: './repo',
        paths: [],
        targetBranch: 'main',
        commitMsg: 'test',
        pullRequest: {
          description: 'testing description',
          title: 'title of pr',
        },
      },
    });

    expect(mockContext.output).toHaveBeenCalled();
    expect(mockContext.output).toHaveBeenCalledWith('pull_request_number', 32);
    expect(mockContext.output).toHaveBeenCalledWith(
      'pull_request_url',
      'http://test.api',
    );
  }, 20000);
});
