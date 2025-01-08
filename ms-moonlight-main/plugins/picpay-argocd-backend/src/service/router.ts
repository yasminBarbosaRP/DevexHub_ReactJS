/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { ArgoCDRepository, Clusters } from '../interfaces/argocd';
import { ArgoCDImpl } from './ArgoCD';

export interface RouterOptions {
  logger: Logger;
  repo: ArgoCDRepository;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, repo } = options;

  const router = Router();
  const service = new ArgoCDImpl(repo);
  router.use(express.json());

  router.get('/clusters', async (request, response) => {
    const bu: string | undefined = request.query.bu
      ? (request.query.bu as string)
      : undefined;
    let clusters: Clusters[] = [];
    try {
      if (!bu) {
        clusters = await service.GetClusters();
      } else {
        clusters = await service.GetClusterFromBU(bu);
      }
      response.status(200).send(clusters);
    } catch (err) {
      if (typeof err === 'string') {
        response.status(500).send({ error: JSON.stringify(err) });
      } else if (err instanceof Error) {
        response.status(500).send({ error: err.message });
      } else {
        logger.error(err);
        response.status(500).send({ error: 'unknown error' });
      }
    }
  });

  router.get('/clusters/:applicationName', async (request, response) => {
    const applicationName: string | undefined = request.params.applicationName
      ? request.params.applicationName
      : undefined;

    if (!applicationName) {
      response.status(400).send({ error: 'applicationName is required' });
    } else {
      try {
        const clusters = await service.GetApplicationClusters(applicationName);
        response.status(200).send(clusters);
      } catch (err) {
        if (typeof err === 'string') {
          response.status(500).send({ error: JSON.stringify(err) });
        } else if (err instanceof Error) {
          response.status(500).send({ error: err.message });
        } else {
          logger.error(err);
          response.status(500).send({ error: 'unknown error' });
        }
      }
    }
  });

  router.use(errorHandler());
  return router;
}
