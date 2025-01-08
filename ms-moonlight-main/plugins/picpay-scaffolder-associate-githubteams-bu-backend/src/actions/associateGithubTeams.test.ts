import os from 'os';
import { PassThrough } from 'stream';
import { getVoidLogger } from '@backstage/backend-common';
import { associateGithubTeams } from './associateGithubTeams';
import MoonlightOrg from '../service/MoonlightOrg';

jest.mock('../repository/GithubRepository');
jest.mock('../service/MoonlightOrg');

describe('moonlight:associate-githubteams-bu', () => {
  const ScmIntegrations = jest.fn();
  const GithubCredentialsProvider = jest.fn().mockImplementation(() => ({
    getCredentials: jest.fn(),
  }));

  const integrations = new ScmIntegrations();
  const githubCredentials = new GithubCredentialsProvider();

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('return without errors', async () => {
    const ActionContext = jest.fn().mockImplementation(() => ({
      input: {
        team: 'test-test',
        bu: 'tech-cross',
      },
      logger: getVoidLogger(),
      logStream: new PassThrough(),
      workspacePath: os.tmpdir(),
      output: jest.fn(),
      createTemporaryDirectory: jest.fn(),
    }));

    const context = new ActionContext();

    // @ts-ignore
    MoonlightOrg.mockImplementation(() => ({
      changeContent: jest.fn(),
      getContent: () => ({
        moonlight: 'foobar',
        spec: {
          children: ['team-a', 'team-b', 'team-c'],
        },
      }),
      push: jest.fn(),
    }));

    const pluginAssociateGithubTeams = associateGithubTeams(
      integrations,
      githubCredentials,
    );
    await pluginAssociateGithubTeams.handler(context);

    expect(MoonlightOrg).toHaveBeenCalled();
    expect(MoonlightOrg).toHaveBeenCalledTimes(1);
    expect(context.output).toHaveBeenCalledWith('teamName', 'test-test');
    expect(context.output).toHaveBeenCalledWith('buName', 'tech-cross');
  });
});
