import { HoustonApiClient } from './apis';
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

describe('HoustonApiClient', () => {
    let configApi: ConfigApi;
    let identityApi: IdentityApi;
    let client: HoustonApiClient;

    beforeEach(() => {
        configApi = {
            getString: jest.fn().mockReturnValue('http://localhost:3000'),
        } as unknown as ConfigApi;

        identityApi = {
            getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
            getProfileInfo: jest.fn(),
            getBackstageIdentity: jest.fn(),
            signOut: jest.fn(),
        } as IdentityApi;

        client = new HoustonApiClient({ configApi, identityApi });
    });

    it('should create an instance', () => {
        expect(client).toBeInstanceOf(HoustonApiClient);
    });

    it('should get flags', async () => {
        const fetchMock = jest.spyOn(global, 'fetch').mockResolvedValue({
            json: () => Promise.resolve({ flag1: { value: true } })
        } as any);

        const flags = await client.getFlags();

        expect(fetchMock).toHaveBeenCalledWith(
            'http://localhost:3000/api/houston/flags', {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
                'Authorization': 'Bearer test-token',
                'Content-Type': 'application/json'
            }
        });
        expect(flags).toEqual({ flag1: { value: true } });
    });
});