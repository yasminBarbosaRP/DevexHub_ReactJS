import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Knex } from 'knex';
import TaskRepository from '../repository/tasks';
import TaskService from './TaskService';
import { TaskStatus } from "@backstage/plugin-scaffolder-node";


export interface RouterOptions {
  logger: Logger;
  database: Knex;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  const repository = new TaskRepository(options.database);
  const service = new TaskService(repository);
  router.use(express.json());
  router.get('/v2/tasks/details', async (req, response) => {
    if (req.query.from && !Date.parse(req.query.from as string) || !req.query.from) {
      response.status(400).json({ error: 'from is not a valid date' });
      return;
    }
    if (req.query.to && !Date.parse(req.query.to as string) || !req.query.to) {
      response.status(400).json({ error: 'to is not a valid date' });
      return;
    }

    const entityRef = req.query.entityRef as string ?? undefined;
    const to = new Date(req.query.to as string);
    const from = new Date(req.query.from as string);

    const result = await service.getExecutionNumbers(entityRef, from, to);
    response.json({ data: result });
  });

  router.get('/v2/tasks/details/:kind/:namespace/:name', async (req, response) => {
    const { kind, namespace, name } = req.params;

    if (!namespace) {
      response.status(400).json({ error: 'namespace is required' });
      return;
    }
    if (!name) {
      response.status(400).json({ error: 'name is required' });
      return;
    }

    if (req.query.status && !['cancelled', 'completed', 'failed', 'open', 'processing'].includes(req.query.status as string)) {
      response.status(400).json({ error: `status must be one of cancelled, completed, failed, open, processing, provided:${req.query.status}` });
      return;
    }

    if (req.query.from && !Date.parse(req.query.from as string)) {
      response.status(400).json({ error: 'from is not a valid date' });
      return;
    }
    if (req.query.to && !Date.parse(req.query.to as string)) {
      response.status(400).json({ error: 'to is not a valid date' });
      return;
    }
    const from = req.query.from ? new Date(req.query.from as string) : undefined;
    const to = req.query.to ? new Date(req.query.to as string) : undefined;

    if (from && !to || to && !from) {
      response.status(400).json({ error: 'from and to must be provided together' });
      return;
    }

    const entityRef = `${kind}:${namespace}/${name}`.toLowerCase();
    const result = await service.getTasks(entityRef, parseInt(req.query.limit as string ?? 0, 10), from, to, req.query.status as TaskStatus ?? undefined, parseInt(req.query.page as string ?? 1, 10));
    response.json({ data: result });
  });
  router.use(errorHandler());
  return router;
}
