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

import { getVoidLogger } from '@backstage/backend-common';
import express from 'express';
import request from 'supertest';
import { AppCluster, Clusters } from '../interfaces/argocd';

import { createRouter } from './router';

describe('createRouter', () => {
  let app: express.Express;

  let breakList: { [key: string]: Error } = {};
  const breakAt = (name: string, error: Error) => {
    breakList[name] = error;
  };

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      repo: {
        async GetClusters(): Promise<Clusters[]> {
          if (breakList.GetClusters) {
            throw breakList.GetClusters;
          }
          return Promise.resolve([]);
        },
        async GetApplicationClusters(_: string): Promise<AppCluster[]> {
          if (breakList.GetApplicationClusters) {
            throw breakList.GetApplicationClusters;
          }
          return Promise.resolve([]);
        },
      },
    });
    app = express().use(router);
  });

  afterEach(() => {
    breakList = {};
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET /clusters', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/clusters');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    });

    it('returns error', async () => {
      breakAt('GetClusters', new Error('err'));
      const response = await request(app).get('/clusters');

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ error: 'err' });
    });
  });

  describe('GET /clusters/ms-moonlight', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/clusters/ms-moonlight');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual([]);
    });

    it('returns error', async () => {
      breakAt('GetApplicationClusters', new Error('err'));
      const response = await request(app).get('/clusters/ms-moonlight');

      expect(response.status).toEqual(500);
      expect(response.body).toEqual({ error: 'err' });
    });
  });
});
