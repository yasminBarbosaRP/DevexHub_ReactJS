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

import {
  errorHandler,
  PluginEndpointDiscovery,
} from '@backstage/backend-common';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { getUserToken } from '@internal/plugin-picpay-core-components';
import * as express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Status } from '../model/Enums';
import { EntityProperty } from './EntityProperty';
import { FausthanosClient } from './fausthanosClient';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  catalog?: CatalogApi;
  discovery: PluginEndpointDiscovery;
}

function getBearerToken(
  authorizationHeader: string | undefined,
): string | undefined {
  if (typeof authorizationHeader !== 'string') {
    return undefined;
  }

  const matches = authorizationHeader.match(/Bearer\s+(\S+)/i);
  return matches?.[1];
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger } = options;
  const catalog =
    options.catalog || new CatalogClient({ discoveryApi: options.discovery });

  logger.info('Initializing Sanctuary II backend');

  const router = Router();
  const api = new FausthanosClient(options);
  const entityProperty = new EntityProperty({ ...options, catalog });

  router.use(express.json());

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });

  router.get('/validate-entity/:componentId', async (request, response) => {
      entityProperty.token = getBearerToken(request.header('authorization'));
      const entity = await entityProperty.hasEntity(request.params.componentId);

      if (!entity) {
        response.status(404).json({ data: 'Record not found' });
        return;
      }
      response.status(200).json({ data: request.params.componentId });
  });

  router.get('/validate-owner/:componentId/:kind?', async (request, response) => {
      entityProperty.token = getBearerToken(request.header('authorization'));
      const { group, owner } = await entityProperty.getOwner(
        request.params.componentId,
        request.params.kind || 'Component',
      );

      if (owner === '' || group === '') {
        response.status(404).json({ data: 'Record not found' });
        return;
      }

      const reviewers = await entityProperty.getReviewersByGroup(group);
      response.status(200).send({ group, owner, reviewers });
  });

  router.post('/component', async (request, response) => {
      try {
        entityProperty.token = getBearerToken(request.header('authorization'));

        const body = request.body;
        const { name, namespace } = await getUserToken({ config, request })

        const { group, owner } = await entityProperty.getOwner(
          body.component.id,
          body.component.kind,
          body.component.name,
        );

        if (owner === '' || group === '') {
          response.status(404).json({ data: Status.GROUP_OWNER_NOT_FOUND });
          return;
        }

        const reviewers = await entityProperty.getReviewersByGroup(group);
        if (reviewers.length === 0) {
          response.status(404).json({ data: Status.REVIEWERS_NOT_FOUND });
          return;
        }

        const requestedEntityBy = await entityProperty.getRequesterEntity(name, namespace);
        // @ts-ignore
        const requestedBy = requestedEntityBy?.spec?.github?.login ??requestedEntityBy?.spec?.profile?.email;

        const result = await api.createAction({
          ...body,
          type: 'delete',
          // we send name when github login or email
          requestedBy: requestedBy ?? requestedEntityBy?.metadata.name,
          owner,
          reviewers,
        });

        response.status(200).json(result);
      } catch (e) {
        response.status(500).json({ data: e.message });
      }
  });

  router.get('/component/:componentId/:kind?', async (request, response) => {
      const componentId: string = decodeURIComponent(
        request.params.componentId,
      );
      entityProperty.token = getBearerToken(request.header('authorization'))

      const statusResponse = await api.getStatus(componentId);
      if (statusResponse?.error !== true) {
        response.status(200).json(statusResponse);
        return;
      }

      const [entity, { group, owner }] = await Promise.all([
        entityProperty.hasEntity(componentId),
        entityProperty.getOwner(componentId,  request.params.kind || 'Component',),
      ]);

      if (!entity) {
        response.status(404).json({ data: Status.COMPONENT_NOT_FOUND });
        return;
      }

      if (owner === '' || group === '') {
        response.status(404).json({ data: Status.GROUP_OWNER_NOT_FOUND });
        return;
      }

      const reviewers = await entityProperty.getReviewersByGroup(group);
      if (reviewers.length === 0) {
        response.status(404).json({ data: Status.REVIEWERS_NOT_FOUND });
        return;
      }

      response.status(200).json(statusResponse);
  });

  router.get('/status/:statusId', async (request, response) => {
      const statusId: string = decodeURIComponent(request.params.statusId);
      entityProperty.token = getBearerToken(request.header('authorization'));

      const statusResponse = await api.getStatusByID(statusId);
      if (statusResponse?.error !== true) {
        response.status(200).json(statusResponse);
        return;
      }

      response.status(200).json(statusResponse);
  });

  router.post('/review', async (request, response) => {
      try {
        const body = request.body;

        switch (body.review_status) {
          case 'approved':
            await api.reviewApprove(body.component_id, body.reviewer);
            break;

          case 'rejected':
            await api.reviewReject(body.component_id, body.reviewer);
            break;

          default:
            response.status(422).json({ message: 'invalid review_status' });
        }

        response.status(200).json({});
      } catch (e) {
        response.status(400).json({ message: 'Request Error' });
      }
  });

  router.patch('/component/:id', async (request, response) => {
      try {
        const { id } = request.params;
        entityProperty.token = getBearerToken(request.header('authorization'));

        await api.patchRequest(id, request.body);
        response.status(200).json({});
      } catch (e) {
        response.status(400).json({});
      }
  });

  router.post('/component/:id/retry', async (request, response) => {
      const { id } = request.params;
      try {
        await api.retryFailure(id);
        response.json({});
      } catch (e) {
        response.status(400).json({ message: 'Request Error' });
      }
  });

  router.delete('/component/:id',async  (request, response) => {
      try {
        const { id } = request.params;
        await api.delete(id);
        response.json({});
      } catch (e) {
        response.status(400).json({ message: 'Request Error' });
      }
  });

  router.get('/components', async (_, response) => {
    try {
      const data = await api.getAll();

      if (data === null) {
        response.status(404).json({ data: 'Records not found' });
        return;
      }

      if (!data?.length) {
        response.status(200).json({ data: [] });
        return;
      }

      response.status(200).json({ data });
    } catch (e) {
      response.status(500).json({ data: e.message });
    }
  });

  router.use(errorHandler());
  return router;
}
