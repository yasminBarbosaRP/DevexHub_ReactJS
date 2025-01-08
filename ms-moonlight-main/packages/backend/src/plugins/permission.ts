import { createRouter } from '@backstage/plugin-permission-backend';
import {
  AuthorizeResult,
  PolicyDecision,
} from '@backstage/plugin-permission-common';
import {
  PermissionPolicy,
  PolicyQuery,
} from '@backstage/plugin-permission-node';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { BackstageIdentityResponse } from '@backstage/core-plugin-api';
// import { qetaPermissions } from '@drodil/backstage-plugin-qeta-common'
// import { devToolsPermissions } from '@backstage/plugin-devtools-common';
import fetch from 'cross-fetch';
import { ConfigApi } from '@backstage/core-plugin-api';

class MoonlightPermissionPolicy implements PermissionPolicy {
  constructor(private config: ConfigApi) { }

  async getHoustonFlags(user?: BackstageIdentityResponse): Promise<any> {
    const response = await fetch(
      `${this.config.getString('backend.baseUrl')}/api/houston/flags`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${user?.token}`,
        },
      },
    );
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  }

  async handle(
    _request: PolicyQuery,
    _user: BackstageIdentityResponse,
  ): Promise<PolicyDecision> {
    // const flags = await this.getHoustonFlags(user);

    // if (request.permission.name === 'catalog.entity.delete') {
    //   return {
    //     result: AuthorizeResult.DENY,
    //   };
    // }

    // if (qetaPermissions.some(permission => isPermission(request.permission, permission))) {
    //   return {
    //     result: AuthorizeResult.ALLOW,
    //   };
    // }

    return {
      result: AuthorizeResult.ALLOW
    };
  }
}

// https://backstage.io/docs/permissions/overview
export default async function createPlugin(
  config: ConfigApi,
  env: PluginEnvironment,
): Promise<Router> {

  return await createRouter({
    config: env.config,
    logger: env.logger,
    discovery: env.discovery,
    policy: new MoonlightPermissionPolicy(config),
    identity: env.identity,
  });
}
