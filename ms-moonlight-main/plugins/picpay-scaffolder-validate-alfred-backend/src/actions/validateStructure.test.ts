import os from 'os';
import { PassThrough } from 'stream';
import { getVoidLogger } from '@backstage/backend-common';
import { validateStructureAction } from './validateStructure';

jest.mock('@backstage/plugin-scaffolder-node', () => ({
  ...jest.requireActual('@backstage/plugin-scaffolder-node'),
  fetchContents: jest.fn(),
}));
jest.mock('@internal/plugin-picpay-scaffolder-commons-backend');

describe('moonlight:alfred-validate-structure', () => {
  const ScmIntegrations = jest.fn();
  const UrlReader = jest.fn();

  const integrations = new ScmIntegrations();
  const reader = new UrlReader();

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Return without errors', async () => {
    const actionMock = {
      input: {
        repository: 'ms-test',
        mainPath: 'terraform',
        content: [
          {
            structure: [
              {
                type: 'file',
                name: ['terragrunt.hcl'],
              },
            ],
          },
        ],
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

    const plugin = validateStructureAction(integrations, reader);

    await plugin.handler(context);
    expect(plugin).toBeTruthy();
  });
});
