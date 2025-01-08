import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';

import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import axios from 'axios';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { DatabaseApiProxy } from '../database/ApiProxyRepository';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);

describe('createRouter', () => {
  let app: express.Express;

  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  const databaseId: TestDatabaseId = 'SQLITE_3';

  beforeAll(async () => {
    const knex = await databases.init(databaseId);

    const router = await createRouter({
      config: new ConfigReader({
        backend: {
          reading: {
            allow: [{ host: 'picpay1.com' }, { host: '*.picpay2.com' }, {}],
          },
        },
      }),
      logger: getVoidLogger(),
      database: await DatabaseApiProxy.create({
        database: {
          getClient: async () => {
            return knex;
          },
        },
      }),
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /', () => {
    it('domain not allowed', async () => {
      mock.onAny().reply(200, { status: 'ok' }, {});

      // @ts-ignore
      const response1 = await request(app)
        .post('/')
        .send({
          url: 'https://google.com',
          method: 'GET',
          body: { 'content-type': 'application/json' },
        });
      expect(response1.status).toEqual(500);

      // @ts-ignore
      const response2 = await request(app)
        .post('/')
        .send({
          url: 'https://teste.picpay1.com',
          method: 'GET',
          body: { 'content-type': 'application/json' },
        });
      expect(response2.status).toEqual(500);

      // @ts-ignore
      const response3 = await request(app)
        .post('/')
        .send({
          url: 'https://picpay2.com',
          method: 'GET',
          body: { 'content-type': 'application/json' },
        });
      expect(response3.status).toEqual(500);
    });

    it('domain allowed', async () => {
      mock.onAny().reply(200, { status: 'ok' }, {});

      // @ts-ignore
      const response1 = await request(app)
        .post('/')
        .send({
          url: 'https://picpay1.com',
          method: 'GET',
          body: { 'content-type': 'application/json' },
        });
      expect(response1.status).toEqual(200);

      // @ts-ignore
      const response2 = await request(app)
        .post('/')
        .send({
          url: 'https://teste.picpay2.com',
          method: 'GET',
          body: { 'content-type': 'application/json' },
        });
      expect(response2.status).toEqual(200);
    });
  });
});
