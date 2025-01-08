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
  createServiceBuilder,
  loadBackendConfig,
} from '@backstage/backend-common';
import { Config } from '@backstage/config';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { JsonValue } from '@backstage/types';
import express from 'express';
import Router from 'express-promise-router';
import { Server } from 'http';
import { PassThrough } from 'stream';
import { Logger } from 'winston';
import { createVaultAction } from './actions/vault';

/**
 
curl --location --request POST 'localhost:7003/run/vault' \
--header 'Content-Type: application/json' \
--data-raw '{
    "serviceName": "ms-teste",
    "buName": "service_bu",
    "environments": ["prd", "test"],
    "envs": {
        "name":"name",
        "alias":"string",
        "value": "string"
        }
}
'
*/
interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({ service: 'scaffolder-envvar-backend' });
  const cfg = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  const router = (log: Logger, config: Config): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/run/vault', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = createVaultAction(config);

        // build params
        const serviceName = request.body?.serviceName as string;
        const bu = request.body?.bu as string;
        const environments = request.body?.environments as string[];
        const envs = request.body?.envs as { name: string; value?: string }[];
        const vaultRegion = request.body?.vaultRegion as string;
        const vaultExtraPath = request.body?.vaultExtraPath as string;
        const separateSecrets = request.body?.separateSecrets as boolean;

        // validate

        // creating action context
        const ctx: ActionContext<{
          serviceName: string;
          bu: string;
          environments: string[];
          envs: { name: string; value?: string }[];
          vaultRegion: string;
          vaultExtraPath: string;
          separateSecrets: boolean;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            serviceName,
            bu,
            environments,
            envs,
            vaultRegion,
            vaultExtraPath,
            separateSecrets,
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
    .addRouter('/', router(logger, cfg));
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}
