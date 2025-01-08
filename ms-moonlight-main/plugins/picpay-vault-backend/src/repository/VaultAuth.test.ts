import { FetchAdapter } from '../adapter';
import { VaultGateway } from '../gateway';
import { VaultAuth } from './VaultAuth';

describe('Vault', () => {
  afterEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('Should export plugin', () => {
    expect(VaultAuth).toBeDefined();
  });

  it('Should Get Vault Token Login', async () => {
    const httpClient = new FetchAdapter();
    jest.spyOn(httpClient, 'post').mockReturnValue(
      Promise.resolve({
        auth: { client_token: 'aaa-bbb-ccc-ddd' },
      }),
    );

    const mockVault = new VaultAuth(new VaultGateway(httpClient), {
      url: 'http://foo',
      roleId: 'aaa-bbb',
      secretId: 'ccc-ddd',
    });

    await mockVault.auth();

    const tokenVault = mockVault.token;
    const expectedToken = { 'X-Vault-Token': 'aaa-bbb-ccc-ddd' };

    expect(tokenVault).toEqual(expectedToken);
  });
});
