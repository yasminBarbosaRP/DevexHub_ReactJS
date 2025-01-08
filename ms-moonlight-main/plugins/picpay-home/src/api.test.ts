import { HomeApiClient } from './api';
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

describe('HomeApiClient', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let client: HomeApiClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('http://localhost'),
    } as unknown as ConfigApi;

    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;
    client = new HomeApiClient({ configApi, identityApi });
  });

  it('should create a new instance', () => {
    expect(client).toBeDefined();
  });

  it('should fetch data', async () => {
    const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: 'test' }),
    } as Response);

    const data = await client.getData('test-endpoint');

    expect(fetchMock).toHaveBeenCalledWith('http://localhost/api/test/test-endpoint', expect.anything());
    expect(data).toEqual({ data: 'test' });

    fetchMock.mockRestore();
  });
});