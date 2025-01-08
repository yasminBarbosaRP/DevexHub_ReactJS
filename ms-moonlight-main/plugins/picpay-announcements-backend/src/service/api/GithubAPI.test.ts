import { ConfigReader } from '@backstage/config';
import { GithubCredentialsProvider } from '@backstage/integration';
import moment from 'moment';
import { AnnouncementsDatabase } from '../persistence/AnnouncementsDatabase';
import { CategoriesDatabase } from '../persistence/CategoriesDatabase';
import { PersistenceContext } from '../persistence/persistenceContext';
import GithubAPI from './GithubAPI';

const config = new ConfigReader({
  app: { baseUrl: 'https://moonlight.test' },
});

const getCredentialsMock = jest.fn();
const maxExpiresAtMock = jest.fn();
const requestMock = jest.fn();

const mockGithubCredentialsProvider = {
  getCredentials: getCredentialsMock,
} as unknown as GithubCredentialsProvider;

const mockPersistenceContext: PersistenceContext = {
  announcementsStore: {
    maxExpiresAt: maxExpiresAtMock,
  } as unknown as AnnouncementsDatabase,
  categoriesStore: {} as unknown as CategoriesDatabase,
};

function OctokitMock() {}
OctokitMock.prototype.request = requestMock;

jest.mock('@octokit/rest', () => ({
  ...jest.requireActual('@octokit/rest'),
  Octokit: OctokitMock,
}));

describe('GithubAPI', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('create/update announcement', async () => {
    getCredentialsMock.mockResolvedValueOnce({
      token: 'fake-token',
    });

    maxExpiresAtMock.mockResolvedValueOnce({
      records: 10,
      expiresAt: moment('2023-08-01T00:00:00.000Z'),
    });

    requestMock.mockResolvedValueOnce({});

    const githubApi = new GithubAPI(
      config,
      mockPersistenceContext,
      mockGithubCredentialsProvider,
    );

    await githubApi.updateAnnouncement();

    expect(getCredentialsMock).toHaveBeenCalled();
    expect(maxExpiresAtMock).toHaveBeenCalled();
    expect(requestMock).toHaveBeenCalledWith('PATCH /orgs/{org}/announcement', {
      org: 'PicPay',
      headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      announcement:
        'Você tem um novo aviso no Moonlight! [Click aqui e saiba mais](https://moonlight.test/announcements).',
      expires_at: '2023-08-01T00:00:00+00:00',
      user_dismissible: false,
    });
  });

  it('remove announcement', async () => {
    getCredentialsMock.mockResolvedValueOnce({
      token: 'fake-token',
    });

    maxExpiresAtMock.mockResolvedValueOnce({
      records: 0,
      expiresAt: null,
    });

    requestMock.mockResolvedValueOnce({});

    const githubApi = new GithubAPI(
      config,
      mockPersistenceContext,
      mockGithubCredentialsProvider,
    );

    await githubApi.updateAnnouncement();

    expect(getCredentialsMock).toHaveBeenCalled();
    expect(maxExpiresAtMock).toHaveBeenCalled();
    expect(requestMock).toHaveBeenCalledWith(
      'DELETE /orgs/{org}/announcement',
      {
        org: 'PicPay',
        headers: { 'X-GitHub-Api-Version': '2022-11-28' },
      },
    );
  });
});
