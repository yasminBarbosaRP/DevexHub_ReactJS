import { errorHandler, PluginDatabaseManager } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { Database } from '../database/Database';
import { RawDbAnnotationRow } from '../database/tables';
import { ValidationError } from '../types/error';
import { Annotations } from './Annotations';
import _ from 'lodash';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  database: PluginDatabaseManager;
}

const notAllowedToChange = [
  'metadata.description',
  'metadata.name',
  'metadata.namespace',
  'metadata.uid',
  'metadata.etag',
  'relations',
  'apiVersion',
  'kind',
  'spec.type',
  'spec.lifecycle',
  'spec.owner',
  'spec.children',
];
const urlRegex =
  /^(https?:\/\/)?([\w-]+(\.[\w-]+)+)(\/[\w-]+)*\/?(\?[^\s]*)?(#\w*)?$/;

const mustAllBeString = (
  data: Record<string, string> | string[],
  validator: string,
) => {
  const dataIsArray = Array.isArray(data);
  const listOfKeys: string[] = dataIsArray ? data : Object.keys(data);
  for (const key of listOfKeys) {
    if (
      (dataIsArray && typeof key !== 'string') ||
      (!dataIsArray && typeof data[key] !== 'string')
    ) {
      throw new ValidationError(
        `${validator} values must be strings and ${key} is not`,
      );
    }
  }
};

const validateExtraFields = (extraFields: Record<string, any>) => {
  if (extraFields.metadata?.labels)
    mustAllBeString(extraFields.metadata?.labels, 'labels');

  for (const notAllowedKey of notAllowedToChange) {
    if (_.get(extraFields, notAllowedKey)) {
      throw new ValidationError(`${notAllowedKey} cannot be changed`);
    }
  }

  if (extraFields.metadata?.tags) {
    if (!Array.isArray(extraFields.metadata?.tags))
      throw new ValidationError('tags must be an array');
    mustAllBeString(extraFields.metadata?.tags, 'tags');
  }

  if (extraFields.metadata?.links) {
    if (!Array.isArray(extraFields.metadata?.links))
      throw new ValidationError('links must be an array');
    for (const link of extraFields.metadata?.links) {
      if (!link.url) throw new ValidationError('links must have an url');
      if (!link.title) throw new ValidationError('links must have a title');
      if (!urlRegex.test(link.url))
        throw new ValidationError('links must have a valid url');
    }
  }
};

const validateBody = (
  payload: RawDbAnnotationRow,
  enforceFilter: boolean = false,
) => {
  if (!payload.annotation && !payload.extraFields)
    throw new ValidationError('annotation or extraFields must be filled');

  if (payload.annotation) {
    mustAllBeString(payload.annotation, 'annotation');
  }

  if (payload.extraFields) validateExtraFields(payload.extraFields);

  if (!payload.filter && enforceFilter)
    throw new ValidationError('filter cannot be empty');
};

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const dbHandler = await Database.create({ database: options.database });
  const annotations = new Annotations({ database: dbHandler });

  const router = Router();
  router.use(express.json());

  router.get('/', async (request, response) => {
    const res = await annotations.get(request.query as Record<string, string>);
    response.json({ data: res });
  });

  router.post('/', async (request, response) => {
    try {
      const reqBody = request.body as RawDbAnnotationRow;
      validateBody(reqBody);

      const res = await annotations.create(reqBody);
      response.json({ data: res });
    } catch (err: any) {
      const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
      if (err instanceof ValidationError) {
        response.status(400).json({ message: err.message });
      } else if (errStr.toString().includes('unique')) {
        response
          .status(409)
          .json({ message: 'Duplicated filter found', error: errStr });
      } else {
        response.status(500).json({ message: 'Error occurred', error: errStr });
      }
    }
  });

  router.patch('/', async (request, response) => {
    try {
      const reqBody = request.body as RawDbAnnotationRow;

      validateBody(reqBody, true);
      const res = await annotations.upsert(request.body as RawDbAnnotationRow);
      response.json({ data: res });
    } catch (err: any) {
      const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
      if (err instanceof ValidationError) {
        response.status(400).json({ message: err.message });
      } else if (errStr.toString().includes('unique')) {
        response
          .status(409)
          .json({ message: 'Duplicated filter found', error: errStr });
      } else {
        response.status(500).json({ message: 'Error occurred', error: errStr });
      }
    }
  });

  router.put('/:id', async (request, response) => {
    try {
      const id = decodeURIComponent(request.params.id);
      const reqBody = request.body as RawDbAnnotationRow;

      validateBody(reqBody);
      const res = await annotations.update(
        id,
        request.body as RawDbAnnotationRow,
      );
      response.json({ data: res });
    } catch (err: any) {
      const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
      if (err instanceof ValidationError) {
        response.status(400).json({ message: err.message });
      } else if (errStr.toString().includes('unique')) {
        response
          .status(409)
          .json({ message: 'Duplicated filter found', error: errStr });
      } else {
        response.status(500).json({ message: 'Error occurred', error: errStr });
      }
    }
  });

  router.delete('/:id', async (request, response) => {
    const id = decodeURIComponent(request.params.id);
    const res = await annotations.remove(id);
    if (res) response.send('OK');
    else response.status(500).send('NOK');
  });

  router.use(errorHandler());
  return router;
}
