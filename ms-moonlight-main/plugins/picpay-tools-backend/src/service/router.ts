import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { GetExploreToolsRequest } from '@backstage-community/plugin-explore-common';
import { CustomProvider } from '../tools';

export interface RouterOptions {
  logger: Logger;
  toolProvider: CustomProvider;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { toolProvider } = options;

  const router = Router();
  router.use(express.json());

  router.get('/', (request, response) => {
    (async () => {
      const requestQuery = parseExploreToolRequestQuery(request.query);
      const result = await toolProvider.getTools(requestQuery);
      response.json(result);
    })();
  });

  router.use(errorHandler());
  return router;
}

function parseExploreToolRequestQuery(
  params: Record<string, unknown>,
): GetExploreToolsRequest {
  return {
    filter: {
      tags: [...[(params?.tag as any) ?? []]].flat(),
      lifecycle: [...[(params?.lifecycle as any) ?? []]].flat(),
    },
  };
}
