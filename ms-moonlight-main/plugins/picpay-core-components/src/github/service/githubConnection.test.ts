import {
  ScmIntegrations,
  DefaultGithubCredentialsProvider,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { ConfigReader } from '@backstage/config';
import { githubConnection } from './githubConnection';

jest.mock('octokit', () => ({
  Octokit: jest.fn().mockImplementation(),
}));

const integrations = ScmIntegrations.fromConfig(
  new ConfigReader({
    backend: {
      baseUrl: 'http://localhost:7000'
    },
    integrations: {
      github: [{ host: 'github.com', token: 'token' }],
    },
  }),
);
const githubCredentialsProvider =
  DefaultGithubCredentialsProvider.fromIntegrations(integrations);

describe('Backend Template Intermediator GithubConnection', () => {
  let mockIntegrations: jest.Mocked<ScmIntegrations>;

  beforeEach(() => {
    jest.clearAllMocks();

    mockIntegrations = {} as jest.Mocked<ScmIntegrations>;
  });

  it('Should be githubConnection defined', () => {
    expect(githubConnection).toBeDefined();
  });

  it('Should create a new Octokit instance with the correct parameters', async () => {
    const repository = 'test-repo';
    const expectedOctokitInstance = new Octokit();
    const mockOctokit = jest.fn();
    (Octokit as jest.MockedClass<typeof Octokit>).mockImplementation(mockOctokit);

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
    expect(mockOctokit).toHaveBeenCalledWith({
      baseUrl: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.machine-man-preview+json',
      },
      auth: 'token',
      previews: ['nebula-preview'],
    });
  });
});