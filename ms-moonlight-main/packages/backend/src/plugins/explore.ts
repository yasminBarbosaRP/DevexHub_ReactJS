import {
    createRouter,
    StaticExploreToolProvider,
  } from '@backstage-community/plugin-explore-backend';
  import { Router } from 'express';
  import { PluginEnvironment } from '../types';
  
  export default async function createPlugin(
    env: PluginEnvironment,
  ): Promise<Router> {
    return await createRouter({
      logger: env.logger,
      toolProvider: StaticExploreToolProvider.fromConfig(env.config),
    });
  }