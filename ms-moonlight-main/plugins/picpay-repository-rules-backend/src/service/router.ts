import { MiddlewareFactory } from '@backstage/backend-defaults/rootHttpRouter';
import { LoggerService } from '@backstage/backend-plugin-api';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { CatalogApi } from '@backstage/catalog-client';
import { v4 as uuid } from 'uuid';
import { repositoryOwner, hasNonDefaultNamespaceParents, validateDate } from './service';
import { Database } from '../database/Database';
import mountTreeByEntityName from '@internal/plugin-picpay-entity-tree-backend';
import { RepoRules } from '../database/tables';

enum Status {
  expired = 'EXPIRED',
  not_expired = 'NOT_EXPIRED',
  contains_parents = 'CONTAINS_PARENTS',
}
export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  catalog: CatalogApi;
  database: Database;
  daysEnv: number
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { logger, config, catalog, database, daysEnv: days } = options;  
  
  logger.info('Initializing Repository Rules Backend');

  const router = Router();
  router.use(express.json());

  router.get('/health', (_, response) => {
    logger.info('PONG!');
    response.json({ status: 'ok' });
  });

  router.get('/owner-parents/:repository', async (request, response) => {
    const repository = request.params.repository;
    const team = await repositoryOwner(catalog, repository);

    if (!team) {
      response.sendStatus(404);
      return;
    }

    const parents = await mountTreeByEntityName(catalog, repository, 'default');
    logger.info(`parents: ${JSON.stringify(parents)}`);
    const containsNonDefaultNamespaceParents = hasNonDefaultNamespaceParents(parents);

    logger.info(`containsNonDefaultNamespaceParents: ${containsNonDefaultNamespaceParents}`);
    if (containsNonDefaultNamespaceParents) {
      logger.info('Contains parents');

      await database.repository().deleteByRepository(repository);
      response.status(200).json({status: Status.contains_parents});
      return;
    }

    const result = await database.repository().getByRepository(repository);
    if (result) {
      let res = Status.not_expired
      if (validateDate(result.until_date)) {
        res = Status.expired;
      }

      response.status(200).json({status: res});
      return;
    }

    const currentDate = new Date();
    const repositoryData: RepoRules = {
      id: uuid(),
      repository,
      team,
      until_date: new Date(currentDate.setDate(currentDate.getDate() + days)),
    }

    await database.repository().save(repositoryData)
    response.status(200).json({status: Status.not_expired});
  });

  const middleware = MiddlewareFactory.create({ logger, config });

  router.use(middleware.error());
  return router;
}
