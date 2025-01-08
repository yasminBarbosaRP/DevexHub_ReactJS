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

/**
 * Payload test
 *
 * curl --location --request POST 'http://localhost:7007/run' \
 * --header 'Content-Type: application/json' \
 * --data-raw '{
 *    "comparisonFilter": [
 *      {
 *        "name": "test",
 *        "originalValue": "0.15.7",
 *        "operation": ">=",
 *        "number": "0.46"
 *      }
 *    ],
 *    "match": [
 *      {
 *        "name": "cd-is-harness-or-moonlight-pipeline-validation",
 *        "rule": "argocd|harness",
 *        "value": "argocd"
 *      },
 *      {
 *        "name": "ci-is-moonlight-pipeline-validation",
 *        "rule": "tekton",
 *        "value": "tekton"
 *      },
 *      {
 *        "name": "helmcharts-is-using-banzaicloud",
 *        "rule": "false",
 *        "value": "true"
 *      }
 *    ],
 *    "name": "testing"
 *  }'
 *
 */

import { PassThrough } from 'stream';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { validationGateAction, Validations } from './actions/validationGate';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';

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

  const router = (log: Logger): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = validationGateAction();

        // build params
        const body = request.body as Validations | undefined;

        // validate
        if (!body) throw new Error('body is empty');

        // creating action context
        const ctx: ActionContext<Validations> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: body,
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
