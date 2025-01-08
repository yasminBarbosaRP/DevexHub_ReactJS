import { getIdentityFromToken } from './UserToken';
import { Config } from '@backstage/config';
import { Request } from 'express';

describe('getIdentityFromToken', () => {
  it('should return user identity for valid token', async () => {
    const mockConfig = {
      getOptionalString: jest.fn().mockReturnValue('user:default/user.test'),
    } as unknown as Config;

    const mockRequest = {
      headers: {
        authorization: process.env.MOONLIGHT_IDENTITY_TOKEN_LOCAL,
      },
    } as unknown as Request;

    const result = await getIdentityFromToken({
      config: mockConfig,
      request: mockRequest,
    });

    expect(result).toEqual({
      type: 'user',
      userEntityRef: 'user:default/user.test',
      ownershipEntityRefs: [],
    });
  });

  it('should return default user identity for development environment', async () => {
    process.env.NODE_ENV = 'development';

    const mockConfig = {
      getOptionalString: jest.fn().mockReturnValue(null),
    } as unknown as Config;

    const mockRequest = {
      headers: {
        authorization: 'invalid_token',
      },
    } as unknown as Request;

    const result = await getIdentityFromToken({
      config: mockConfig,
      request: mockRequest,
    });

    expect(result).toEqual({
      type: 'user',
      userEntityRef: 'user:default/user.guest',
      ownershipEntityRefs: [],
    });

    process.env.NODE_ENV = 'test';
  });
});