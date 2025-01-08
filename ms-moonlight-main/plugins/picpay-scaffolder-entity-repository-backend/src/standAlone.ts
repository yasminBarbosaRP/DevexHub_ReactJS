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

import { PassThrough } from 'stream';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { entityRepositoryAction } from './actions/entityRepository';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import {
  createServiceBuilder,
  loadBackendConfig,
  SingleHostDiscovery,
} from '@backstage/backend-common';
import { Server } from 'http';
import express from 'express';
import Router from 'express-promise-router';
import { CatalogClient } from '@backstage/catalog-client';

export interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({
    service: 'scaffolder-entity-repository',
  });
  const config = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  const router = (log: Logger): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const baseUrl = config.getString('backend.baseUrl');
        log.info(baseUrl);
        const discoveryApi = SingleHostDiscovery.fromConfig(config);
        log.info(await discoveryApi.getBaseUrl('moonlight:http-request'));
        const action = entityRepositoryAction(
          new CatalogClient({ discoveryApi }),
        );

        // build params
        const entityName = request.body?.name as string;
        const kind = request.body?.kind as string;
        const type = request.body?.type as string;
        const namespace = request.body?.namespace as string;
        const org = request.body?.org as string;
        const output = request.body?.output as { alias: string; key: string }[];

        // validate
        if (!entityName) throw new Error('name is empty');

        // creating action context
        const ctx: ActionContext<{
          name: string;
          kind?: string;
          type?: string;
          namespace?: string;
          org?: string;
          output?: { alias: string; key: string }[];
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            name: entityName,
            kind,
            type,
            namespace,
            org,
            output,
          },
          createTemporaryDirectory(): Promise<string> {
            //  if your plugin performs io operations, you should implement this
            throw new Error('Not implemented');
          },
          getInitiatorCredentials(): Promise<any> {
            throw new Error('Function not implemented.');
          },
          checkpoint(): Promise<any> {
            throw new Error('Function not implemented.');
          },
        };

        await action.handler(ctx);
        response.send({ status: 'ok' });
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

    return routes;
  };

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/', router(logger));
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}
