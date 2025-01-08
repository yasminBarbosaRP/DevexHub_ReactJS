import { IdentityApi } from '@backstage/core-plugin-api';
import { MockConfigApi } from '@backstage/test-utils';
import { ManageTemplateVersionApiClient } from './api';

describe('ManageTemplateVersionApiClient', () => {
  let client: ManageTemplateVersionApiClient;

  beforeEach(() => {
    const tokenFunction = jest.fn();
    const identityApi = {
      getCredentials: tokenFunction,
    } as unknown as IdentityApi;
    const configApi = new MockConfigApi({});


    client = new ManageTemplateVersionApiClient({
      configApi: configApi,
      identityApi,
    });
  });

  it('should update the template', async () => {
    const request = {
      hash: 'test-hash',
      name: 'test-name',
      repository: 'test-repo',
      branch: 'test-branch',
    };

    const mockResponse = {};
    jest.spyOn(client, 'update').mockResolvedValue(mockResponse);

    const response = await client.update(request);

    expect(response).toEqual(mockResponse);
    expect(client.update).toHaveBeenCalledWith(request);
  });
});