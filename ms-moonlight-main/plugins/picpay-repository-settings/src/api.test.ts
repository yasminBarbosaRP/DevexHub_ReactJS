import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { RepositorySettingsApiClient } from './apis';
import { RepositoryVisibility } from '@internal/plugin-picpay-scaffolder-github-common';

describe('RepositorySettingsApiClient', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let client: RepositorySettingsApiClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('/api/github/repository/'),
    } as unknown as ConfigApi;
    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;
    client = new RepositorySettingsApiClient({ configApi, identityApi });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Should get Repository Settings', async () => {
    const mockResponse = {
      projectSlug: 'test-project-slug',
      canUpdateSetting: true,
      requireApprovals: 1,
      requireCodeOwnerReviews: true,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: 'public' as RepositoryVisibility,
    };

    jest.spyOn(client, 'getRepositorySettings').mockResolvedValue(mockResponse);

    const response = await client.getRepositorySettings('test-entity');

    expect(response).toEqual(mockResponse);
  });
  it('Should save Repository Settings', async () => {
    const mockResponse = {
      projectSlug: 'test-project-slug',
      canUpdateSetting: true,
      requireApprovals: 1,
      requireCodeOwnerReviews: true,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: 'public' as RepositoryVisibility,
    };

    jest
      .spyOn(client, 'saveRepositorySettings')
      .mockResolvedValue(mockResponse);

    const response = await client.saveRepositorySettings('test-entity', {
      projectSlug: 'test-project-slug',
      canUpdateSetting: true,
      requireApprovals: 1,
      requireCodeOwnerReviews: true,
      deleteBranchOnMerge: true,
      protectionExists: true,
      visibility: 'public' as RepositoryVisibility,
    });

    expect(response).toEqual(mockResponse);
  });
});
