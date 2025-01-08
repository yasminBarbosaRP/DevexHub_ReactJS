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

import { PassThrough } from 'stream';
import { loadBackendConfig, UrlReaders } from '@backstage/backend-common';
import {
  ScmIntegrations,
} from '@backstage/integration';
import { updateBranchProtection } from './actions/branch-protection';
import { Config } from '@backstage/config';
import { JsonValue } from '@backstage/types';
import { Logger } from 'winston';
import { createServiceBuilder } from '@backstage/backend-common';
import { Server } from 'http';

import express from 'express';
import Router from 'express-promise-router';
import { Bypasses } from './models/branch-protection';
import { updateInfraHelmchartsAction } from './actions/infra-helmcharts';
import { pushToBranchAction } from './actions/push-to-branch';
import { deleteWebhookAction } from './actions/delete-webhook'
import { getFileAction } from './actions/get-file';
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
    const reader = UrlReaders.default({ config, logger: log });

    const router = Router();
    router.use(express.json());

    router.post('/run/helmcharts', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = updateInfraHelmchartsAction(
          integrations,
          reader,
          githubCredentialsProvider,
        );

        // build params
        const serviceName = request.body?.serviceName as string;
        const skipDepUp = request.body?.skipDepUp as boolean;
        const pullRequest = request.body?.pullRequest as string;
        const valuesFilePath = request.body?.valuesFilePath as string[];
        const bu = request.body?.pullRequest as string;
        const vaultRoleName = request.body?.pullRequest as string;

        // validate
        if (!serviceName) throw new Error('serviceName is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            serviceName,
            skipDepUp,
            pullRequest,
            valuesFilePath,
            bu,
            vaultRoleName,
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

    router.post('/run', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = updateBranchProtection(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repo = request.body?.repo as string;
        const branch = (request.body?.branch as string) || 'main';
        const statusChecks = (request.body?.statusChecks as string[]) || [];
        const enforceAdmins = request.body?.enforceAdmins as boolean;
        const requireCodeOwnerReviews = request.body
          ?.requireCodeOwnerReviews as boolean;
        const bypasses = request.body?.bypasses as Bypasses;

        log.info(`Enforce Admins: ${enforceAdmins}`);

        // validate
        if (!repo) throw new Error('repo is empty');
        if (!branch) throw new Error('branch is empty');
        if (typeof statusChecks !== 'object' || statusChecks === undefined)
          throw new Error('statusChecks needs to be an array');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repo: repo,
            branch: branch,
            approvers: 1,
            statusChecks: statusChecks,
            enforceAdmins: enforceAdmins,
            requireCodeOwnerReviews: requireCodeOwnerReviews,
            bypasses: bypasses,
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

    router.post('/run/delete-webhook', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = deleteWebhookAction(
          integrations,
          githubCredentialsProvider,
        );

        const repository = request.body?.repository as string;
        const webhookUrl = request.body?.webhookurL as string;

        if (!repository) throw new Error('repository is empty');
        if (!webhookUrl) throw new Error('webhookUrl is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            repository,
            webhookUrl,
          },
          createTemporaryDirectory(): Promise<string> {
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

    router.post('/run/push-to-branch', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = pushToBranchAction(
          integrations,
          githubCredentialsProvider,
        );

        // build params
        const repo = request.body?.repo as string;
        const cwd = request.body?.cwd as string;
        const paths = request.body?.paths as string[];
        const targetBranch = request.body?.targetBranch as string;
        const baseBranch = request.body?.baseBranch as string;
        const commitMsg = request.body?.commitMsg as string;
        const pullRequest = request.body?.pullRequest as {
          title: string;
          description: string;
        };

        // validate
        if (!repo) throw new Error('repo is empty');
        if (!repo) throw new Error('repo is empty');
        if (!cwd) throw new Error('cwd is empty');
        if (!paths) throw new Error('paths is empty');
        if (!targetBranch) throw new Error('targetBranch is empty');
        if (!commitMsg) throw new Error('commitMsg is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`finished, ${name}, ${value}`);
          },
          input: {
            cwd,
            paths,
            repo,
            targetBranch,
            baseBranch,
            commitMsg,
            pullRequest,
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

    router.post('/run/get-files', async (request, response) => {
      try {
        log.info('request received');

        // setup
        const action = getFileAction(integrations, githubCredentialsProvider)

        // build params
        const { repository, filepath, throwOnError = false } = request.body

        log.debug(`${request.body}`)
        log.debug(`Repository: ${repository}`);

        // validate
        if (!repository) throw new Error('repository is empty');
        if (!filepath) throw new Error('filepath is empty');

        await action.handler({
          logger: options.logger,
          logStream: new PassThrough(),
          workspacePath: '/tmp',
          output: (name: string, value: JsonValue) => {
            options.logger.info(`output: ${name}, ${value}`);
          },
          input: {
            repository,
            filepath,
            throwOnError,
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
    })
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
