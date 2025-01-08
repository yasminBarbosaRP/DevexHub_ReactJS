// router.test.ts

import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import mountTreeByEntityName from './mountTreeByEntityName';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import { Logger } from 'winston';

jest.mock('./mountTreeByEntityName');

describe('createRouter', () => {
  let app: express.Express;
  let catalog: CatalogApi;
  let logger: Logger;

  beforeAll(async () => {
    catalog = {} as CatalogClient;
    logger = getVoidLogger();

    // Mock implementation of mountTreeByEntityName
    const mockMountTreeByEntityName = mountTreeByEntityName as jest.MockedFunction<
      typeof mountTreeByEntityName
    >;

    mockMountTreeByEntityName.mockImplementation(
      async (
        _catalog: CatalogApi,
        name: string,
        namespace: string = 'default',
        kind: string = 'Component',
      ) => {
        if (name === 'not-found') {
          return null;
        }

        return {
          name,
          namespace,
          kind,
          data: 'mocked data',
          parents: [],
        };
      },
    );

    const router = await createRouter({
      logger,
      catalog,
    });

    app = express().use(router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /:namespace?/:kind?/:name/parents/', () => {
    it('returns 404 when entity not found', async () => {
      const response = await request(app).get('/not-found/parents/');

      expect(response.status).toBe(404);
      expect(mountTreeByEntityName).toHaveBeenCalledWith(
        catalog,
        'not-found',
        'default',
        undefined,
      );
    });

    it('returns result with default namespace and kind', async () => {
      const response = await request(app).get('/my-entity/parents/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        name: 'my-entity',
        namespace: 'default',
        kind: 'Component',
        data: 'mocked data',
        parents: []
      });
      expect(mountTreeByEntityName).toHaveBeenCalledWith(
        catalog,
        'my-entity',
        'default',
        undefined,
      );
    });

    it('returns result with specified namespace and kind', async () => {
      const response = await request(app).get(
        '/default/component/my-entity/parents/',
      );

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        name: 'my-entity',
        namespace: 'default',
        kind: 'Component',
        data: 'mocked data',
        parents: []
      });
      expect(mountTreeByEntityName).toHaveBeenCalledWith(
        catalog,
        'my-entity',
        'default',
        'Component',
      );
    });

    it('returns result with specified kind and default namespace', async () => {
      const response = await request(app).get('/default/my-entity/parents/');

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        name: 'my-entity',
        namespace: 'default',
        kind: 'Component',
        data: 'mocked data',
        parents: []
      });
      expect(mountTreeByEntityName).toHaveBeenCalledWith(
        catalog,
        'my-entity',
        'default',
        undefined,
      );
    });
  });
});
