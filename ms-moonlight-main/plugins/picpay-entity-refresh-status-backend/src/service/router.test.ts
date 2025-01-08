import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { createRouter } from './router';
import { RefreshState } from '../interfaces/refreshState';
import { CatalogApi } from '@backstage/catalog-client';

const data: RefreshState = {
  entity_id: 'abc123',
  entity_ref: 'group:example_reference',
  unprocessed_entity: 'example_unprocessed_entity',
  unprocessed_hash: 'xyz789',
  processed_entity: 'example_processed_entity',
  result_hash: '123abc',
  cache: 'example_cache',
  next_update_at: new Date('2023-01-01T12:00:00Z'),
  last_discovery_at: new Date('2022-12-01T08:30:00Z'),
  errors: 'example_errors',
  location_key: 'example_location_key',
};

describe('createRouter', () => {
  let app: express.Express;
  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  const databaseId: TestDatabaseId = 'SQLITE_3';

  beforeAll(async () => {
    const knex = await databases.init(databaseId);
    await knex.schema.createTable('refresh_state', table => {
      table.uuid('entity_id').primary();
      table.string('entity_ref');
      table.string('unprocessed_entity');
      table.string('unprocessed_hash');
      table.string('processed_entity');
      table.string('result_hash');
      table.string('cache');
      table.timestamp('next_update_at').notNullable();
      table.timestamp('last_discovery_at').notNullable();
      table.string('errors');
      table.string('location_key');
    });
    await knex('refresh_state').insert(data);
    const catalogApi: jest.Mocked<CatalogApi> = {
      getLocationById: jest.fn(),
      getEntityByName: jest.fn(),
      getEntities: jest.fn(async () => ({
        items: [],
      })),
      addLocation: jest.fn(),
      getLocationByRef: jest.fn(),
      removeEntityByUid: jest.fn(),
    } as any;
    const router = await createRouter({
      logger: getVoidLogger(),
      database: knex,
      catalog: catalogApi,
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /', () => {
    it('returns right data', async () => {
      const response = await request(app).get(
        '/?entity_ref=group:example_reference',
      );
      expect(response.status).toEqual(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].entity_id).toEqual('abc123');
    });
    it('returns empty', async () => {
      const response = await request(app).get(
        '/?entity_ref=group:exaxxmple_reference',
      );
      expect(response.status).toEqual(200);
      expect(response.body.data.length).toBe(0);
    });
  });
});
