import { errorHandler } from '@backstage/backend-common';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import {
  githubConnection,
  GithubRepository,
} from '@internal/plugin-picpay-core-components';
import { MoonlightTemplatesRepository } from '@internal/plugin-picpay-scaffolder-templates-intermediator-backend';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, integrations, githubCredentialsProvider } = options;
  logger.info('Initializing Manage Template Version Backend');

  const router = Router();
  const gitOwner = 'PicPay';
  const github = await githubConnection(
    'moonlight-templates',
    integrations,
    githubCredentialsProvider,
  );
  const githubRepository = new GithubRepository(github);

  router.use(express.json());

  router.get('/health', (_, response) => {
    response.json({ status: 'ok' });
  });

  router.post('/commit', async (request, response) => {
    const { body: { hash, repository, branch, name } } = request;

    logger.info(`Received hash: ${hash}`);
    logger.info(`Received repository: ${repository}`);
    logger.info(`Received branch: ${branch}`);
    logger.info(`Received name: ${name}`);
    logger.info(`githubRepository: ${githubRepository}`);

    try {
      const listHashes = await githubRepository.getHashes(
        gitOwner,
        repository,
        branch,
        3,
      );

      logger.info(`Received listHashes: ${listHashes}`);

      const moonlightTemplate = new MoonlightTemplatesRepository({
        githubRepository,
        organization: gitOwner,
        repository,
        sha: [hash],
        listHash: listHashes,
        logger,
      });

      const content = await moonlightTemplate.changeContent(
        await moonlightTemplate.getTemplate(),
        false
      );
      await moonlightTemplate.updateFileMoonlightTemplates(content);

      response.status(200).json({});
    } catch (error: any) {
      logger.error(`Error to update template version: ${error.message}`);
      response.status(400).json({ error: error.message });
    }
  });

  router.use(errorHandler());
  return router;
}