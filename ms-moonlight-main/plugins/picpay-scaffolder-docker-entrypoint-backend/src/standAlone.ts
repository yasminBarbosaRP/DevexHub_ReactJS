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
import { dockerEntrypointAction } from './actions/dockerEntrypoint';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import {
  createServiceBuilder,
  loadBackendConfig,
} from '@backstage/backend-common';
import { Server } from 'http';
import express from 'express';
import Router from 'express-promise-router';
import {
  ScmIntegrations,
} from '@backstage/integration';
import fs from 'fs-extra';
import os from 'os';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

export interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({
    service: 'scaffolder-docker-entrypoint',
  });
  const config = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });
  const integrations = ScmIntegrations.fromConfig(config);
  const githubCredentialsProvider =
    PicPayGithubCredentialsProvider.fromIntegrations(integrations);
  const router = (log: Logger): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = dockerEntrypointAction(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const entityName = request.body?.name as string;

        // validate
        if (!entityName) throw new Error('name is empty');

        // creating action context
        const ctx: ActionContext<{
          repository: string;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(
              `output_info; name:${name}, value:${JSON.stringify(value)}`,
            );
          },
          input: {
            repository: entityName,
          },
          async createTemporaryDirectory(): Promise<string> {
            const timestamp = new Date().getTime();
            await fs.mkdir(
              `${os.tmpdir}/scaffolder-docker-entrypoint-${timestamp}`,
            );
            return Promise.resolve(
              `${os.tmpdir}/scaffolder-docker-entrypoint-${timestamp}`,
            );
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
