import { PassThrough } from 'stream';
import {
  loadBackendConfig,
  createServiceBuilder,
} from '@backstage/backend-common';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { Server } from 'http';
import express from 'express';
import Router from 'express-promise-router';
import { associateGithubTeams } from './actions/associateGithubTeams';
import fs from 'fs-extra';
import os from 'os';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

/**
    Payload test
    
    curl --location 'localhost:7008/run' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "squadName": "atlantis",
        "bu": "tech-cross"
    }'

        Payload test
    
    curl --location 'localhost:7008/run/branchprotecion' \
    --header 'Content-Type: application/json' \
    --data-raw '{
        "repo": "moonlight-org",
        "branch": "main",
        "enforceAdmins": false
    }'
 */

interface ServerOptions {
  logger: Logger;
  port: number;
  enableCors: boolean;
}

export async function standAlone(options: ServerOptions): Promise<Server> {
  const logger = options.logger.child({
    service: 'scaffolder-associate-githubteams',
  });
  const config = await loadBackendConfig({
    logger: options.logger,
    argv: process.argv,
  });

  const router = (log: Logger): express.Router => {
    const integrations = ScmIntegrations.fromConfig(config);
    const githubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);

    const r = Router();
    r.use(express.json());

    r.post('/run', async (request, response) => {
      try {
        log.info('request received');

        const action = associateGithubTeams(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const team = request.body?.team as string;
        const bu = request.body?.bu as string;
        // validate

        // creating action context
        const ctx: ActionContext<{
          team: string;
          bu: string;
        }> = {
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            team,
            bu,
          },
          async createTemporaryDirectory(): Promise<string> {
            const timestamp = new Date().getTime();
            await fs.mkdir(
              `${os.tmpdir}/scaffolder-associate-githubteams-${timestamp}`,
            );
            return Promise.resolve(
              `${os.tmpdir}/scaffolder-associate-githubteams-${timestamp}`,
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
