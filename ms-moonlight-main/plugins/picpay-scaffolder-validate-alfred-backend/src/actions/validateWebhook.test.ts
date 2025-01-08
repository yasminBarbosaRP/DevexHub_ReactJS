import os from 'os';
import { PassThrough } from 'stream';
import { getVoidLogger } from '@backstage/backend-common';
import { validateWebhookAction } from './validateWebhook';

jest.mock('@internal/plugin-picpay-scaffolder-commons-backend');
jest.mock('./helper/helper');

describe('moonlight:alfred-validate-webhook', () => {
  const ScmIntegrations = jest.fn();
  const GithubCredentialsProvider = jest.fn().mockImplementation(() => ({
    getCredentials: jest.fn(),
  }));

  const integrations = new ScmIntegrations();
  const githubCredentials = new GithubCredentialsProvider();

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Return without errors', async () => {
    const actionMock = {
      input: {
        repository: 'ms-test',
        webhook: ['mywebhook.ppay.me/link'],
        throwError: false,
      },
      logger: getVoidLogger(),
      logStream: new PassThrough(),
      workspacePath: os.tmpdir(),
      output: jest.fn(),
      createTemporaryDirectory: jest.fn(),
    };
    const ActionContext = jest.fn().mockImplementation(() => actionMock);

    const context = new ActionContext();

    const plugin = validateWebhookAction(integrations, githubCredentials);
    await plugin.handler(context);
    expect(plugin).toBeTruthy();
  });
});
