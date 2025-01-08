/* istanbul ignore file */

import express from 'express';
import Router from 'express-promise-router';

import { Server } from 'http';
import { Logger } from 'winston';
import { PassThrough } from 'stream';
import { Config } from '@backstage/config';
import { JsonValue } from '@backstage/types';
import { loadBackendConfig } from '@backstage/backend-common';
import { createServiceBuilder } from '@backstage/backend-common';
import { harnessClusterIdentidy } from './actions/harnessClusterDiscovery';
import {
  ScmIntegrations,
} from '@backstage/integration';
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

    router.post('/run/check', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = harnessClusterIdentidy(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const serviceName = request.body?.serviceName as string;

        log.info(`Service Name: ${serviceName}`);

        // validate
        if (!serviceName) throw new Error('the serviceName is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            serviceName,
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
