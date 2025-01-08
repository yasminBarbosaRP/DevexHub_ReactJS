import { PassThrough } from 'stream';
import { loadBackendConfig, UrlReaders } from '@backstage/backend-common';
import {
  ScmIntegrations,
  DefaultGithubCredentialsProvider,
} from '@backstage/integration';
import { Config } from '@backstage/config';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';

import express from 'express';
import Router from 'express-promise-router';
import { clusterDiscovery } from './actions/argo-rollouts-cluster-discovery';
import { argoRolloutAdoption } from './actions/argo-rollouts-adoption';
import { rolloutsInstall } from './actions/argo-rollouts-install';

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
      DefaultGithubCredentialsProvider.fromIntegrations(integrations);
    UrlReaders.default({ config, logger: log });

    const router = Router();
    router.use(express.json());

    router.post('/run/cluster-discovery', async (request, response) => {
      try {
        log.info('Rollout checker request received');

        const { repository, environment } = request.body;
        if (!repository) {
          return response.status(400).send({ message: 'Repository is required.' });
        }

        const action = clusterDiscovery(integrations, githubCredentialsProvider);

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`Rollout checker finished, ${name}: ${value}`);
          },
          input: { repository, environment },
          createTemporaryDirectory: async (): Promise<string> => {
            throw new Error('Not implemented');
          },
          getInitiatorCredentials: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
          checkpoint: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
        });

        response.send({ status: 'ok' });
      } catch (err) {
        options.logger.error(`Error handling rollout checker: ${err}`);
        if (typeof err === 'string') {
          response.status(500).send({ message: err });
        } else if (err instanceof Error) {
          response.status(500).send({ message: err.message });
        } else {
          response.status(500).send({ message: 'Unknown error occurred' });
        }
      }
      return response;
    })

    router.post('/run/argo-rollouts-adoption', async (request, response) => {
      try {
        log.info('Rollout checker request received');

        const { cluster } = request.body;

        if (!cluster) {
          return response.status(400).send({ message: 'Cluster is required.' });
        }

        const action = argoRolloutAdoption(integrations, githubCredentialsProvider);
        let outputArray: JsonValue = { };

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`Rollout checker finished, ${name}: ${value}`);
            outputArray = value;
          },
          input: { cluster },
          createTemporaryDirectory: async (): Promise<string> => {
            throw new Error('Not implemented');
          },
          getInitiatorCredentials: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
          checkpoint: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
        });

        response.send({ status: 'ok', outputArray: outputArray });
      } catch (err) {
        options.logger.error(`Error handling rollout checker: ${err}`);
        if (typeof err === 'string') {
          response.status(500).send({ message: err });
        } else if (err instanceof Error) {
          response.status(500).send({ message: err.message });
        } else {
          response.status(500).send({ message: 'Unknown error occurred' });
        }
      }
      return response;
    })

    router.post('/run/argo-rollouts-install', async (request, response) => {
      try {
        log.info('Rollout install request received');

        const { repository,
          environment,
          duration,
          weights,
          type,
          interval,
          analysisUrl,
          analysisSuccessCondition,
          timeout
        } = request.body;

        if (!repository) {
          return response.status(400).send({ message: 'Repository is required.' });
        }

        const action = rolloutsInstall(integrations, githubCredentialsProvider);
        let outputArray: JsonValue = { };

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`Rollout checker finished, ${name}: ${value}`);
            outputArray = value;
          },
          input: { repository,
            environment,
            duration,
            weights,
            type,
            interval,
            analysisUrl,
            analysisSuccessCondition,
            timeout},
          createTemporaryDirectory: async (): Promise<string> => {
            throw new Error('Not implemented');
          },
          getInitiatorCredentials: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
          checkpoint: async (): Promise<any> => {
            throw new Error('Not implemented');
          },
        });

        response.send({ status: 'ok', outputArray: outputArray });
      } catch (err) {
        options.logger.error(`Error handling rollout checker: ${err}`);
        if (typeof err === 'string') {
          response.status(500).send({ message: err });
        } else if (err instanceof Error) {
          response.status(500).send({ message: err.message });
        } else {
          response.status(500).send({ message: 'Unknown error occurred' });
        }
      }
      return response;
    })

    return router;
  };

  const logger = options.logger.child({ service: 'argo-rollouts-replica-checker-backend' });
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
