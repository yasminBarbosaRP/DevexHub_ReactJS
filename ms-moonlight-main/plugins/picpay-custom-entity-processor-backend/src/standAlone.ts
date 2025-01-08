/*
 * Copyright 2020 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http:// www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import { Entity } from '@backstage/catalog-model';
import express from 'express';
import Router from 'express-promise-router';
import { PicPayEntityProcessor } from './service/PicPayEntityProcessor';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { useHotMemoize } from '@backstage/backend-common';
import knexFactory from 'knex';
import { AnnotationIntermediator } from '@internal/plugin-picpay-annotation-intermediator-backend';

interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({ service: 'scaffolder-envvar-backend' });
  logger.level = 'debug';
  const database = useHotMemoize(module, () => {
    const knex = knexFactory({
      client: 'better-sqlite3',
      connection: ':memory:',
      useNullAsDefault: true,
    });
    knex.client.pool.on('createSuccess', (_eventId: any, resource: any) => {
      resource.run('PRAGMA foreign_keys = ON', () => {});
    });
    return knex;
  });

  const expressrouter = async (log: Logger): Promise<express.Router> => {
    const router = Router();
    router.use(express.json());
    // @ts-expect-error: Let's ignore because this is a test, and we're accessing useCase here
    const intermediator: AnnotationIntermediator =
      await AnnotationIntermediator.init(logger, {
        getClient: async () => database,
      });

    router.get('/intermediator', async (_, response) => {
      const res = await intermediator.useCase.get({});

      response.send(res);
    });

    router.post('/intermediator', async (request, response) => {
      // build params
      const filter = request.body?.filter as Record<string, string>;
      const annotation = request.body?.annotation as Record<string, string>;

      const res = await intermediator.useCase.create({ filter, annotation });

      response.send(res);
    });

    router.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = new PicPayEntityProcessor(logger, [intermediator]);

        // build params
        const name = request.body?.name as string;
        const kind = request.body?.kind as string;

        // validate

        const entity: Entity = {
          apiVersion: 'backstage.io/v1alpha1',
          metadata: {
            name,
            annotations: {
              'backstage.io/source-location':
                'url:https://github.com/PicPay/ms-moonlight',
            },
          },
          kind,
        };
        const locationSpec: LocationSpec = {
          type: 'test',
          target: 'test2',
        };
        await action.postProcessEntity(entity, locationSpec, () => true);
        response.send({ entity });
      } catch (err) {
        if (typeof err === 'string') {
          response.status(500).send({ message: err });
        } else if (err instanceof Error) {
          response.status(500).send({ message: err.message });
        } else {
          response.status(500).send({ message: err });
        }
      }
    });

    return router;
  };

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/', await expressrouter(logger));
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http:// localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}
