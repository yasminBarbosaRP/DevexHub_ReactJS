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

import { Server } from 'http';
import { Logger } from 'winston';
import { PassThrough } from 'stream';
import { CatalogClient } from '@backstage/catalog-client';
import { createServiceBuilder } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { JsonValue } from '@backstage/types';
import {
  ScmIntegrations,
} from '@backstage/integration';
import {
  loadBackendConfig,
  SingleHostDiscovery,
} from '@backstage/backend-common';

import { migrateServiceFromLegacyClusterToNew } from './';

import express from 'express';
import Router from 'express-promise-router';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

export interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const createRouter = (log: Logger, config: Config): express.Router => {
    const integrations = ScmIntegrations.fromConfig(config);
    const discoveryApi = SingleHostDiscovery.fromConfig(config);
    const githubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);
    const catalogApi = new CatalogClient({ discoveryApi });

    const router = Router();
    router.use(express.json());

    router.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = migrateServiceFromLegacyClusterToNew(
          integrations,
          catalogApi,
          githubCredentialsProvider,
        );

        // build params
        const serviceName = request.body?.serviceName as string;
        const deployType = request.body?.deployType as string;
        const clusters = request.body?.clusters as any;

        log.info(
          `Service: ${serviceName} | Cluster: ${JSON.stringify(
            clusters,
          )} | Deploy Type: ${deployType}`,
        );

        log.info('Executing handler..');
        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            serviceName,
            deployType,
            clusters,
          },
          createTemporaryDirectory(): Promise<string> {
            // if your plugin performs io operations, you should implement this
            throw new Error('Not implemented');
          },
          getInitiatorCredentials(): Promise<any> {
            throw new Error('Function not implemented.');
          },
          checkpoint(): Promise<any> {
            throw new Error('Function not implemented.');
          }
        });
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

    return router;
  };

  const logger = options.logger.child({ service: 'scaffolder-github-backend' });
  const config = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  let service = createServiceBuilder(module)
    .setPort(options.port)
    .addRouter('/', createRouter(logger, config));
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}
