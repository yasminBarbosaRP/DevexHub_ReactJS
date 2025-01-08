import { PassThrough } from 'stream';
import { loadBackendConfig, UrlReaders } from '@backstage/backend-common';
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
import { validateWebhookAction } from './actions/validateWebhook';
import { validateStructureAction } from './actions/validateStructure';
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

    /**
      curl --location --request POST 'localhost:7008/validate-alfred/webhook' \
       --header 'Content-Type: application/json' \
       --data-raw '{
           "repository": "ms-renegotiation-workflow-infra",
           "webhook": [
               "alfred-prd.ppay.me/events"
           ],
           "throwError": false
       }'
     */
    router.post('/validate-alfred/webhook', async (request, response) => {
      try {
        log.info('request received');

        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider =
          PicPayGithubCredentialsProvider.fromIntegrations(integrations);
        const action = validateWebhookAction(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repository = request.body?.repository as string;
        const webhook = request.body?.webhook as string[];
        const throwError = request.body?.throwError as boolean;

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repository,
            webhook,
            throwError,
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

    /*
        curl --location --request POST 'localhost:7008/validate-alfred/structure' \
        --header 'Content-Type: application/json' \
        --data-raw '{
        "repository": "ms-renegotiation-workflow-infra",
        "mainPath": "terraform",
        "throwError": false,
        "content": [
              {
                "structure": [
                {
                  "type": "file",
                  "name": [
                    "terragrunt.hcl"
                  ]
                }
              ]
            },
            {
              "path": "picpay-creditrecover-qa",
              "structure": [
                {
                  "type": "dir",
                  "name": [
                    "us-east-1"
                  ]
                },
                {
                  "type": "file",
                  "name": [
                    "common.hcl"
                  ]
                }
              ]
            }
          ]
        }'
    */
    router.post('/validate-alfred/structure', async (request, response) => {
      try {
        log.info('request received');

        const integrations = ScmIntegrations.fromConfig(config);
        const reader = UrlReaders.default({ config, logger: log });
        const action = validateStructureAction(integrations, reader);

        // build params
        const repository = request.body?.repository as string;
        const mainPath = request.body?.mainPath as string;
        const content = request.body?.content as {
          path?: string;
          structure: {
            type: string;
            name: string[];
          }[];
        }[];
        const throwError = request.body?.throwError as boolean;

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repository,
            mainPath,
            content,
            throwError,
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
    service: 'scaffolder-validate-alfred-webhook',
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
