import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import fetch from 'cross-fetch';
import { Logger } from 'winston';
import {
  VisionAPIEvaluationResponse,
  VisionAPISourcesResponse,
} from '../types/api';
import { createVisionCatalogContentResponse } from './service';
import { Config } from '@backstage/config';

export interface RouterOptions {
  config: Config;
  logger: Logger;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger } = options;

  const router = Router();
  router.use(express.json());

  const visionBaseUrl = config.getConfig('vision').get('url');

  router.get('/catalog/:projectName', async (request, response) => {
    const requestInit: RequestInit = {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    try {
      const projectRequest = await fetch(`${visionBaseUrl}/project/${request.params.projectName}`, requestInit);
      const projectData = await projectRequest.json();

      if (!projectData.active) {
        response.status(404).json({ error: true, message: 'Project not monitored' });
        return;
      }
    } catch (err) {
      logger.error(err);
      response.status(404).json({ error: true, err, message: 'Project not found or not monitored'});
      return;
    }

    try {
      const evaluationsRequestUrl = `${visionBaseUrl}/project/${request.params.projectName}/evaluation`;
      const sourcesRequestUrl = `${visionBaseUrl}/sources`;

      const evaluationRequest = fetch(evaluationsRequestUrl, requestInit);
      const sourcesRequest = fetch(sourcesRequestUrl, requestInit);

      const [evaluationResponse, sourcesResponse] = await Promise.all([
        evaluationRequest,
        sourcesRequest,
      ]);

      const [evaluationData, sourcesData] = (await Promise.all([
        evaluationResponse.json(),
        sourcesResponse.json(),
      ])) as [VisionAPIEvaluationResponse, VisionAPISourcesResponse];

      const bffResponse = createVisionCatalogContentResponse(
        evaluationData,
        sourcesData,
      );

      response.status(200).json(bffResponse);
    } catch (err) {
      logger.error(err);
      response.status(500).json({ error: true, err});
    }
  });

  router.post('/catalog/:projectName/sources', async (request, response) => {
    try {
      const requestUrl = `${visionBaseUrl}/project/${request.params.projectName}/sources`;

      const requestInit: RequestInit = {
        method: 'POST',
        body: JSON.stringify({
          sourceId: request.body.sourceId,
        }),
        headers: {
          'Content-Type': 'application/json',
        },
      };

      await fetch(requestUrl, requestInit);

      response.sendStatus(204);
    } catch (error) {
      logger.error(error);
      response.status(500).json({ error: true, message: error });
    }
  });

  router.delete(
    '/catalog/:projectName/sources/:sourceId',
    async (request, response) => {
      try {
        const requestUrl = `${visionBaseUrl}/project/${request.params.projectName}/sources/${request.params.sourceId}`;

        const requestInit: RequestInit = {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        await fetch(requestUrl, requestInit);

        response.sendStatus(204);
      } catch (error) {
        logger.error(error);
        response.status(500).json({ error: true, message: error });
      }
    },
  );

  router.delete(
    '/catalog/:projectName/sources/:sourceId',
    async (request, response) => {
      try {
        const requestUrl = `${visionBaseUrl}/project/${request.params.projectName}/sources/${request.params.sourceId}`;

        const requestInit: RequestInit = {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        await fetch(requestUrl, requestInit);

        response.sendStatus(204);
      } catch (error) {
        logger.error(error);
        response.status(500).json({ error: true, message: error });
      }
    },
  );

  router.delete(
    '/catalog/:projectName/sources/:sourceId',
    async (request, response) => {
      try {
        const requestUrl = `${visionBaseUrl}/project/${request.params.projectName}/sources/${request.params.sourceId}`;

        const requestInit: RequestInit = {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
        };

        await fetch(requestUrl, requestInit);

        response.sendStatus(204);
      } catch (error) {
        logger.error(error);
        response.status(500).json({ error: true, message: error });
      }
    },
  );

  router.post('/catalog/:projectName/refresh', async (request, response) => {
    try {
      const requestUrl = `${visionBaseUrl}/project/${request.params.projectName}/evaluation`;

      const requestInit: RequestInit = {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      };

      await fetch(requestUrl, requestInit);

      response.sendStatus(204);
    } catch (error) {
      logger.error(error);
      response.status(500).json({ error: true, message: error });
    }
  });

  router.get('/:id/score', async (request, response) => {
    try {
      const getArrayFromQueryParam = (param: any) => Array.isArray(param) ? param : [param];
      const groups = getArrayFromQueryParam(request.query.squads);
      const queryParams = groups.map((group: any) => `squads=${group}`).join('&');
      const fetchUrl = `${visionBaseUrl}/source/${request.params.id}/score?${queryParams}`;
  
      const scoreResponse = await fetch(fetchUrl);
      if (!scoreResponse.ok) {
        throw new Error('Falha ao buscar o score');
      }
  
      const data = await scoreResponse.json();
      response.json({ score: data.score });
    } catch (error) {
      logger.error('Erro ao buscar score:', error);
      response.status(500).json({ error: 'Erro ao buscar o score' });
    }
  });

  router.get('/:id/metrics/projects', async (request, response) => {
    try {
      const getArrayFromQueryParam = (param: any) => Array.isArray(param) ? param : [param];

      const groups = request.query.squads ? getArrayFromQueryParam(request.query.squads) : [];
      const metrics = request.query.metrics ? getArrayFromQueryParam(request.query.metrics) : [];
      const queryParams = new URLSearchParams();

      groups.forEach(group => queryParams.append('squads', group));
      metrics.forEach(metric => queryParams.append('metrics', metric));
      const fetchUrl = `${visionBaseUrl}/sources/${request.params.id}/metrics/projects?${queryParams.toString()}`;
  
      const scoreResponse = await fetch(fetchUrl);
      if (!scoreResponse.ok) {
        throw new Error(`Falha ao buscar os detalhes das métricas: ${scoreResponse.statusText}`);
      }
        response.json(await scoreResponse.json());
    } catch (error) {
      logger.error('Falha ao buscar os detalhes das métricas:', error);
      response.status(500).json({ error: 'Falha ao buscar os detalhes das métricas' });
    }
  });

  router.use(errorHandler());
  return router;
}