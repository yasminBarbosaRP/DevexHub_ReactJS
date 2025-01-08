import { Request } from 'express';
import { SingleHostDiscovery } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import {
  IdentityClient,
  getBearerTokenFromAuthorizationHeader,
} from '@backstage/plugin-auth-node';
import { BackstageUserIdentity } from '@backstage/core-plugin-api';

const PREFIXES = [
  'user:default/',
  'user:picpay/',
  'user:external/',
  'user:picpaybank/',
];

type Options = {
  config: Config;
  request: Request;
};

export const getIdentityFromToken = async (
  options: Options,
): Promise<BackstageUserIdentity | undefined> => {
  const { config, request } = options;
  const authorization = request.headers.authorization;

  if (
    authorization === process.env.MOONLIGHT_IDENTITY_TOKEN_LOCAL ||
    process.env.NODE_ENV === 'development'
  ) {
    return {
      type: 'user',
      userEntityRef:
        config.getOptionalString('localhost.userEntityRef') ??
        'user:default/user.guest',
      ownershipEntityRefs: [],
    };
  }

  const discovery = SingleHostDiscovery.fromConfig(config);
  const identity = IdentityClient.create({
    discovery,
    issuer: await discovery.getExternalBaseUrl('auth'),
  });

  const token = getBearerTokenFromAuthorizationHeader(
    request.headers.authorization,
  );

  const user = token ? await identity.authenticate(token) : undefined;

  return user?.identity;
};

export const getUserEntityRef = async (options: Options): Promise<string> => {
  const identity = await getIdentityFromToken(options);

  if (identity === undefined) {
    return '';
  }

  return identity.userEntityRef;
};

const removePrefix = (str: string, prefix: string) => str.startsWith(prefix) ? str.slice(prefix.length) : str;

export const getUserToken = async (options: Options): Promise<{name: string, namespace: string }> => {
  let userFound = await getUserEntityRef(options);
  let prefixFound = '';

  for (const prefix of PREFIXES) {
    const newUser = removePrefix(userFound, prefix);
    if (newUser !== userFound) {
      userFound = newUser;
      prefixFound = removePrefix(prefix, 'user:').replace(/\//g, '');;
      break;
    }
  }
  
  return { name: userFound, namespace: prefixFound };
};

