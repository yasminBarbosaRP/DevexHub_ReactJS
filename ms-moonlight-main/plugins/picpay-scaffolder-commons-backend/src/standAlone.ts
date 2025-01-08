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

import express from 'express';
import Router from 'express-promise-router';

import { Server } from 'http';
import { Logger } from 'winston';
import { PassThrough } from 'stream';
import { Config } from '@backstage/config';
import { JsonValue } from '@backstage/types';
import { loadBackendConfig } from '@backstage/backend-common';
import { createServiceBuilder } from '@backstage/backend-common';
import { checkAlreadyIsOnMoonlight } from './actions/checkMoonlightAvailability';
import {
  ScmIntegrations,
} from '@backstage/integration';
import fs from 'fs-extra';
import { readFileAction } from './actions/readFile';
import os from 'os';
import { createEnvsAction } from './actions/createEnvs';
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
    const githubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);

    const router = Router();
    router.use(express.json());

    router.post('/run/read-file', async (request, response) => {
      try {
        log.info('request received');

        const action = readFileAction();

        // build params
        const path = request.body?.path as string;
        const outputFormat = request.body?.outputFormat as 'object' | 'text';
        const fileFormat = request.body?.fileFormat as 'json' | 'yaml' | 'text';

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            path,
            outputFormat,
            fileFormat,
          },
          async createTemporaryDirectory(): Promise<string> {
            const timestamp = new Date().getTime();
            await fs.mkdir(`${os.tmpdir}/scaffolder-commons-${timestamp}`);
            return Promise.resolve(
              `${os.tmpdir}/scaffolder-commons-${timestamp}`,
            );
          },
          getInitiatorCredentials(): Promise<any> {
            throw new Error('Function not implemented.');
          },
          checkpoint(): Promise<any> {
            throw new Error('Function not implemented.');
          },
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

    router.post('/run/check', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = checkAlreadyIsOnMoonlight(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repositoryName = request.body?.repositoryName as string;

        log.info(`Repository Name: ${repositoryName}`);

        // validate
        if (!repositoryName) throw new Error('repositoryName is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repositoryName,
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
          },
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

    router.post('/run/create-envs', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = createEnvsAction();

        // build params
        const envs = request.body?.envs as { name: string, value: string }[];

        // validate
        if (!envs) throw new Error('envs is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            envs,
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
          },
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
