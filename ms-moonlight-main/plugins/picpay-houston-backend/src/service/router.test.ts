import { ConfigReader } from '@backstage/config';
import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import crossFetch from 'cross-fetch';

jest.mock('cross-fetch', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

describe('createRouter', () => {
  let app: express.Express;

  beforeAll(async () => {
    const router = await createRouter({
      config: new ConfigReader({
        houston: {
          url: 'http://moonlight.test',
          appId: 'moonlight',
          squadName: 'Atlantis',
        },
      }),
      logger: getVoidLogger(),
    });
    app = express().use(router);
  });

  beforeEach(() => {
    // jest.resetAllMocks();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /flags', () => {
    it('returns ok', async () => {
      // @ts-ignore
      crossFetch.mockResolvedValue({
        json: async () => ({
          flagBool: { value: true },
          flagJSON: { value: { teste: 123 } },
          flagString: { value: 'string' },
        }),
      });
      const response = await request(app).get('/flags');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({
        flagBool: true,
        flagJSON: { teste: 123 },
        flagString: 'string',
      });
    });
  });
});
