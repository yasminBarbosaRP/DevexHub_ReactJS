import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { HistoryApi } from './api';

describe('HistoryApi', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let historyApi: HistoryApi;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('http://localhost'),
    } as unknown as ConfigApi;

    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;

    historyApi = new HistoryApi({ configApi, identityApi });
  });

  it('should create an instance', () => {
    expect(historyApi).toBeDefined();
  });

  it('should fetch data with correct url and headers', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({ data: 'test' }),
    } as any);

    const data = await historyApi.getHistoryComponent();

    expect(global.fetch).toHaveBeenCalledWith('http://localhost/api/sanctuary-two/components', {
      headers: {
        Accept: 'application/json',
        Authorization: 'Bearer test-token',
        'Content-Type': 'application/json',
      },
    });
    expect(data).toEqual({ data: 'test' });
  });
});