/**
 * Payload test
 *
 * curl --header "content-type: application/json" "localhost:7008/run" -d '{"serviceName": "ms-abuse", "deployType": "harness"}'
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
import { gitChangeDirectoryAction } from './actions/GitChangeDirectory';
import { Config } from '@backstage/config';
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
        const action = gitChangeDirectoryAction(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repositoryName = request.body?.repositoryName as string;
        const serviceName = request.body?.serviceName as string;
        const sourcePath = request.body?.sourcePath as string;
        const destPath = request.body?.destPath as string;
        const baseBranch = request.body?.baseBranch as string;
        const targetBranch = request.body?.targetBranch as string;

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repositoryName,
            serviceName,
            sourcePath,
            destPath,
            baseBranch,
            targetBranch,
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
    service: 'moonlight:change-directory',
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
