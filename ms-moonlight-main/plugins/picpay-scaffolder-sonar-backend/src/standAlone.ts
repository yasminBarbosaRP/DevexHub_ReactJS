/**
 * Payload test
 *
 * curl --header "content-type: application/json" "localhost:7008/run" -d '{"repo": "ms-teste", "bu": "Tech Cross", "squad": "devup"}'
 *
 */

import { PassThrough } from 'stream';
import { loadBackendConfig } from '@backstage/backend-common';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import express from 'express';
import Router from 'express-promise-router';
import { Config } from '@backstage/config';
import { createSonarProjectAction } from './actions/sonar';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const createRouter = (log: Logger, config: Config): express.Router => {
    const router = Router();
    router.use(express.json());

    router.post('/run', async (request, response) => {
      try {
        log.info('request received');

        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider =
          PicPayGithubCredentialsProvider.fromIntegrations(integrations);
        const action = createSonarProjectAction(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repo = request.body?.repo as string;
        const bu = request.body?.bu as string;
        const squad = request.body?.squad as string;

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repo,
            bu,
            squad,
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

  const logger = options.logger.child({
    service: 'moonlight:sonar',
  });
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
