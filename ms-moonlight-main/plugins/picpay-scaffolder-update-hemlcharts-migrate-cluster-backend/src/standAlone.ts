/**

    Payload test
    
    curl --location 'localhost:7008/run' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "serviceName": "ms-testequarkus5",
        "deployType": "harness",
        "affinity":"teste",
        "environments": ["qa"],
        "bu": "teste",
        "segregateChartsByEnvironment": true,
        "externalSecretsMountPath": {"qa" : "cluster-teste-qa"}
    }'


 */

import { PassThrough } from 'stream';
import { loadBackendConfig } from '@backstage/backend-common';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';
import express from 'express';
import Router from 'express-promise-router';
import { updateHelmcharts } from './actions/updateHelmcharts';
import fs from 'fs-extra';
import os from 'os';
import { JsonObject } from '@backstage/types';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({
    service: 'scaffolder-identity-ci-backend',
  });
  const config = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  const router = (log: Logger): express.Router => {
    const r = Router();
    r.use(express.json());

    r.post('/run', async (request, response) => {
      try {
        log.info('request received');

        const integrations = ScmIntegrations.fromConfig(config);
        const githubCredentialsProvider =
          PicPayGithubCredentialsProvider.fromIntegrations(integrations);
        const action = updateHelmcharts(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const serviceName = request.body?.serviceName as string;
        const deployType = request.body?.deployType as string;
        const affinity = request.body?.affinity as string;
        const environments = request.body?.environments as string[];
        const externalSecretsMountPath = request.body
          ?.externalSecretsMountPath as JsonObject;
        const bu = request.body?.bu as string;
        const segregateChartsByEnvironment = request.body
          ?.segregateChartsByEnvironment as boolean;
        // validate

        // creating action context
        const ctx: ActionContext<{
          serviceName: string;
          deployType: string;
          affinity: string;
          environments: string[];
          externalSecretsMountPath: JsonObject;
          bu: string;
          segregateChartsByEnvironment: boolean;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            serviceName,
            deployType,
            affinity,
            environments,
            externalSecretsMountPath,
            bu,
            segregateChartsByEnvironment,
          },
          async createTemporaryDirectory(): Promise<string> {
            const timestamp = new Date().getTime();
            await fs.mkdir(
              `${os.tmpdir}/scaffolder-update-hemlcharts-migrate-cluster-${timestamp}`,
            );
            return Promise.resolve(
              `${os.tmpdir}/scaffolder-update-hemlcharts-migrate-cluster-${timestamp}`,
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

    return r;
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
