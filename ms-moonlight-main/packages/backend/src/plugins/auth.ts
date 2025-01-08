import {
  createRouter,
  providers,
  defaultAuthProviderFactories,
  OAuthResult,
  AuthResolverContext,
  AuthResolverCatalogUserQuery,
} from '@backstage/plugin-auth-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import {
  DEFAULT_NAMESPACE,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { ProfileInfo } from '@backstage/core-plugin-api';
import fetch from 'cross-fetch';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const updateUserEntityInfo = async (
    ctx: AuthResolverContext,
    raw: any,
    query: AuthResolverCatalogUserQuery,
  ) => {
    try {
      const user = await ctx.findCatalogUser(query);
      const res = await fetch(
        `${env.config.getString(
          'backend.baseUrl',
        )}/api/annotation-intermediators`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            filter: {
              'metadata.name': user.entity.metadata.name,
              kind: 'User',
            },
            annotation: {
              'azure.com/job-title': raw.jobTitle,
              'azure.com/office-location': raw.officeLocation,
              'azure.com/mobile-phone': raw.mobilePhone || 'not provided',
            },
          }),
        },
      );
      env.logger.info(
        `update user entity info after login returned ${res.status}`,
      );
    } catch (err) {
      env.logger.error(`failed to update user entity info after login ${err}`);
    }
  };

  return createRouter({
    logger: env.logger,
    config: env.config,
    database: env.database,
    discovery: env.discovery,
    tokenManager: env.tokenManager,
    providerFactories: {
      ...defaultAuthProviderFactories,
      microsoft: providers.microsoft.create({
        signIn: {
          resolver: async ({ profile, result }, ctx) => {
            if (!profile.email) {
              throw new Error(
                'Login failed, user profile does not contain an email',
              );
            }

            const p = async (
              userProfile: ProfileInfo,
              r: OAuthResult,
            ): Promise<{ token: string }> => {
              try {
                const rawResponse = JSON.parse(
                  (r?.fullProfile as any)._raw ?? {},
                );
                env.logger.debug(`login_raw_response: ${JSON.stringify(rawResponse)}`)
                const catalogUserQuery = {
                  filter: {
                    kind: ['User'],
                    'metadata.namespace': process.env.AUTH_DEFAULT_NAMESPACE === 'true' ? DEFAULT_NAMESPACE as string : userProfile.email?.split('@')[1].split('.')[0] as string,
                    'spec.profile.email': userProfile.email as string,
                  },
                };

                const signInResult = await ctx.signInWithCatalogUser(
                  catalogUserQuery,
                );

                if (rawResponse.jobTitle) {
                  await updateUserEntityInfo(
                    ctx,
                    rawResponse,
                    catalogUserQuery,
                  );
                } else {
                  env.logger.info(
                    `raw_doesnt_exit: ${JSON.stringify(
                      rawResponse,
                    )}... full_profile:${JSON.stringify(r?.fullProfile)}`,
                  );
                }

                return signInResult;
              } catch (err) {
                env.logger.error(`Failed to sign in with catalog user: ${err}`);
                // We again use the local part of the email as the user name.
                const [localPart] = userProfile.email?.split('@') ?? [];

                // By using `stringifyEntityRef` we ensure that the reference is formatted correctly
                const userEntityRef = stringifyEntityRef({
                  kind: 'User',
                  name: localPart,
                  namespace: DEFAULT_NAMESPACE,
                  spec: {
                    profile: {
                      email: userProfile.email,
                      displayName: userProfile.displayName,
                      picture: userProfile.picture,
                    },
                  },
                });

                return ctx.issueToken({
                  claims: {
                    sub: userEntityRef,
                    ent: [userEntityRef],
                  },
                });
              }
            };

            return p(profile, result);
          },
        },
      }),
    },
  });
}
