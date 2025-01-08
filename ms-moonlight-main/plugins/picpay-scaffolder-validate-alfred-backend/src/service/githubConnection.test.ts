import { githubConnection } from './githubConnection';
import {
  ScmIntegrations,
  DefaultGithubCredentialsProvider,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { ConfigReader } from '@backstage/config';

jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(),
}));

const integrations = ScmIntegrations.fromConfig(
  new ConfigReader({
    integrations: {
      github: [{ host: 'github.com', token: 'token' }],
    },
  }),
);
const githubCredentialsProvider =
  DefaultGithubCredentialsProvider.fromIntegrations(integrations);

describe('Alfred GithubConnection', () => {
  let mockIntegrations: jest.Mocked<ScmIntegrations>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIntegrations = {} as jest.Mocked<ScmIntegrations>;
  });

  test('Should return a valid Octokit instance', async () => {
    const repository = 'test-repo';
    const expectedOctokitInstance = new Octokit();

    const getCredentials = jest.spyOn(
      githubCredentialsProvider,
      'getCredentials',
    );
    const octokit = await githubConnection(
      repository,
      mockIntegrations,
      githubCredentialsProvider,
    );

    expect(octokit).toEqual(expectedOctokitInstance);
    expect(getCredentials).toHaveBeenCalledWith({
      url: `https://github.com/PicPay/${repository}`,
    });
  });
});
