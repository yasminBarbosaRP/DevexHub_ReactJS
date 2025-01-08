import { PassThrough } from 'stream';
import { Server } from 'http';
import { Logger } from 'winston';
import express from 'express';
import Router from 'express-promise-router';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import {
  createServiceBuilder,
  HostDiscovery,
  loadBackendConfig,
} from '@backstage/backend-common';
import { JsonValue } from '@backstage/types';
import { CatalogClient } from '@backstage/catalog-client';
import { ScmIntegrations } from '@backstage/integration';
import { Config } from '@backstage/config';
import { templatesIntermediatorAction } from './actions/templatesIntermediator';
import { BackstageCredentials } from '@backstage/backend-plugin-api';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

/**
 * Este é um exemplo de uma requisição POST usando o comando curl.
 * A requisição é enviada para o servidor local na porta 7009.
 *
 * @example
 * // Exemplo de uso:
 * curl --location --request POST 'localhost:7009' \
 * --header 'Content-Type: application/json' \
 * --data-raw '{
 *     "templateName": "repository",
 *     "owner": "squad-atlantis"
 * }'
 *
 * @param {string} templateName - O nome do template. Neste caso, é "repository".
 * @param {string} owner - O proprietário do template. Neste caso, é "squad-atlantis".
 *
 * @returns {Object} A resposta do servidor.
 */
export interface ServerOptions {
  port: number;
  enableCors: boolean;
  logger: Logger;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({ service: 'scaffolder-templates-intermediator' });
  const cfg = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  const router = (log: Logger, config: Config): express.Router => {
    const routes = Router();
    routes.use(express.json());

    routes.post('/', async (request, response) => {
      try {
        log.info('request received');

        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider = PicPayGithubCredentialsProvider.fromIntegrations(integrations);
        const discoveryApi = HostDiscovery.fromConfig(config);
        // setup
        const action = templatesIntermediatorAction(
          integrations,
          githubCredentialsProvider,
          new CatalogClient({ discoveryApi }),
        );

        // build params
        const templateName = request.body?.templateName as string;
        const owner = request.body?.owner as string;
        // validate

        // creating action context
        const ctx: ActionContext<{
          templateName: string;
          owner: string;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            templateName,
            owner,
          },
          createTemporaryDirectory(): Promise<string> {
            //  if your plugin performs io operations, you should implement this
            throw new Error('Not implemented');
          },
          checkpoint(): Promise<any> {
            throw new Error('Function not implemented.');
          },
          getInitiatorCredentials(): Promise<BackstageCredentials> {
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
    .addRouter('/', router(logger, cfg));
  if (options.enableCors) {
    service = service.enableCors({ origin: 'http://localhost:3000' });
  }

  return await service.start().catch(err => {
    logger.error(err);
    process.exit(1);
  });
}
