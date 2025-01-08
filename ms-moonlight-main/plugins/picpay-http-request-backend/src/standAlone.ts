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
import { httpRequestAction, Environments } from './actions/httpRequest';
import { JsonValue } from '@backstage/types';
import { BackstageCredentials } from '@backstage/backend-plugin-api';
import { createServiceBuilder } from '@backstage/backend-common';
import { Logger } from 'winston';
import { Server } from 'http';
import { Method } from 'axios';
import express from 'express';
import Router from 'express-promise-router';

export interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function startStandaloneServer(
  options: ServerOptions,
): Promise<Server> {
  const logger = options.logger.child({ service: 'scaffolder-github-backend' });
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const router = (log: Logger): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = httpRequestAction();

        // build params
        const url = request.body?.url as string;
        const method = request.body?.method as Method;
        const expectedStatusCode = request.body?.expectedStatusCode as number[];
        const headers = request.body?.headers as { [key: string]: string };
        const environments = request.body?.environments as Environments[];
        const body = request.body?.body as { [key: string]: string };
        const printResultAfter = request.body?.printResultAfter as boolean;
        const throwOutput = request.body?.printResultAfter as boolean;

        // validate
        if (!url) throw new Error('url is empty');
        if (!method) throw new Error('method is empty');

        // creating action context
        const ctx: ActionContext<{
          url: string;
          method: Method;
          headers?: { [key: string]: string };
          body?: { [key: string]: string };
          environments?: Environments[];
          expectedStatusCode?: number[];
          printResultAfter?: boolean;
          throwOutput?: boolean;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            url,
            method,
            expectedStatusCode,
            headers,
            environments,
            body,
            printResultAfter,
            throwOutput,
          },
          createTemporaryDirectory(): Promise<string> {
            //  if your plugin performs io operations, you should implement this
            throw new Error('Not implemented');
          },
          getInitiatorCredentials(): Promise<BackstageCredentials> {
            throw new Error('Function not implemented.');
          },
          checkpoint(): Promise<any> {
            throw new Error('Function not implemented.');
          }
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
