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
import { RequestModel } from '../models/request';
import { ResponseModel } from '../models/response';
import { ConfigReader } from '@backstage/config';
import { createRouter } from './router';
import { Entity } from '@backstage/catalog-model';
import { CatalogApi } from '@backstage/catalog-client';

describe('createRouter', () => {
  let app: express.Express;

  let mockUserResponse = {
    page: 1,
    has_next_page: false,
    data: [
      {
        id: '61a9490ab3edc68c168de92d',
        user_id: 'MDQ6VXNlcjM5NTcwOTIz',
        personal_email: '',
        username: 'mock_user',
        sso_email: 'mock.user@picpay.com',
        joined_at: null,
        first_collaboration: {
          commit: '61ca13538ee68531b2bee9b5',
          commit_id: 'b5e930847f748c8c51922b94c75b82a72599201b',
          commit_date: '2021-09-02T17:33:33Z',
          deploy_date: '2021-09-02T19:19:34Z',
          service: {
            id: '61899e0249eae4c890beb2c3',
            name: 'ms-mock-app',
          },
        },
        removed_at: null,
        is_on_org: true,
        last_update: '2022-08-31T00:09:11.189Z',
      },
    ],
  };

  let mockGroupsResponse: Entity = {
    apiVersion: 'v1',
    kind: 'User',
    metadata: {
      name: 'mock_user',
    },
    spec: {
      memberOf: ['team-a'],
    },
  };

  let breakList: { [key: string]: Error } = {};
  const breakAt = (name: string, error: Error) => {
    breakList[name] = error;
  };

  const makeEntity = (
    kind: string,
    namespace: string,
    name: string,
  ): Entity => ({
    apiVersion: 'backstage.io/v1beta1',
    kind,
    metadata: { namespace, name },
  });

  beforeAll(async () => {
    const catalogApi: jest.Mocked<CatalogApi> = {
      getLocationById: jest.fn(),
      getEntityByName: jest.fn(),
      getEntities: jest.fn(async () => ({
        items: [makeEntity('User', 'default', 'eibrunorodrigues')],
      })),
      addLocation: jest.fn(),
      getLocationByRef: jest.fn(),
      removeEntityByUid: jest.fn(),
    } as any;

    const router = await createRouter({
      config: new ConfigReader({}),
      logger: getVoidLogger(),
      catalog: catalogApi,
      userRepository: {
        getUser(_: RequestModel): Promise<ResponseModel> {
          if (breakList.getUser !== undefined) {
            throw breakList.getUser;
          }
          return Promise.resolve(mockUserResponse);
        },
      },
      groupsRepository: {
        getUserGroups(_): Promise<Entity> {
          if (breakList.getUserGroups !== undefined) {
            throw breakList.getUserGroups;
          }
          return Promise.resolve(mockGroupsResponse);
        },
      },
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(() => {
    breakList = {};
    mockGroupsResponse = {
      apiVersion: 'v1',
      kind: 'User',
      metadata: {
        name: 'mock_user',
      },
      spec: {
        memberOf: ['team-a'],
      },
    };
    mockUserResponse = {
      page: 1,
      has_next_page: false,
      data: [
        {
          id: '61a9490ab3edc68c168de92d',
          user_id: 'MDQ6VXNlcjM5NTcwOTIz',
          personal_email: '',
          username: 'mock_user',
          sso_email: 'mock.user@picpay.com',
          joined_at: null,
          first_collaboration: {
            commit: '61ca13538ee68531b2bee9b5',
            commit_id: 'b5e930847f748c8c51922b94c75b82a72599201b',
            commit_date: '2021-09-02T17:33:33Z',
            deploy_date: '2021-09-02T19:19:34Z',
            service: {
              id: '61899e0249eae4c890beb2c3',
              name: 'ms-mock-app',
            },
          },
          removed_at: null,
          is_on_org: true,
          last_update: '2022-08-31T00:09:11.189Z',
        },
      ],
    };
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /info', () => {
    it('returns ok', async () => {
      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });

      expect(response.status).toEqual(200);
    });

    it('returns 500', async () => {
      breakAt('getUser', new Error('example'));
      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });
      expect(response.status).toEqual(500);
    });

    it('returns 400 empty querystring', async () => {
      const response = await request(app).get('/info');

      expect(response.status).toEqual(400);
    });

    it('returns 400 empty querystring if empty sso_email', async () => {
      const response = await request(app).get('/info').query({ sso_email: '' });

      expect(response.status).toEqual(400);
    });

    it('returns 400 empty querystring if empty sso_email and username', async () => {
      const response = await request(app)
        .get('/info')
        .query({ sso_email: '', username: '' });

      expect(response.status).toEqual(400);
    });

    it('returns 404 not found empty data[]', async () => {
      mockUserResponse = {
        page: 0,
        has_next_page: false,
        data: [],
      };
      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.user@picpay.com' });
      expect(response.status).toEqual(404);
    });

    it('returns 200 multiple users', async () => {
      mockUserResponse = {
        page: 1,
        has_next_page: false,
        data: [
          {
            id: '61a9490ab3edc68c168de92d',
            user_id: 'MDQ6VXNlcjM5NTcwOTIz',
            personal_email: '',
            username: 'mock_user',
            sso_email: 'mock.user@picpay.com',
            joined_at: null,
            first_collaboration: {
              commit: '61ca13538ee68531b2bee9b5',
              commit_id: 'b5e930847f748c8c51922b94c75b82a72599201b',
              commit_date: '2021-09-02T17:33:33Z',
              deploy_date: '2021-09-02T19:19:34Z',
              service: {
                id: '61899e0249eae4c890beb2c3',
                name: 'ms-mock-app',
              },
            },
            removed_at: null,
            is_on_org: true,
            last_update: '2022-08-31T00:09:11.189Z',
          },
          {
            id: '61a9490ab3edc68c168de92d',
            user_id: 'MDQ6VXNlcjM5NTcwOTIz',
            personal_email: '',
            username: 'mock_user',
            sso_email: 'mock.user@picpay.com',
            joined_at: null,
            first_collaboration: {
              commit: '61ca13538ee68531b2bee9b5',
              commit_id: 'b5e930847f748c8c51922b94c75b82a72599201b',
              commit_date: '2021-09-02T17:33:33Z',
              deploy_date: '2021-09-02T19:19:34Z',
              service: {
                id: '61899e0249eae4c890beb2c3',
                name: 'ms-mock-app',
              },
            },
            removed_at: null,
            is_on_org: true,
            last_update: '2022-08-31T00:09:11.189Z',
          },
        ],
      };
      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });

      expect(response.status).toEqual(200);
    });

    it('returns ok groups validation', async () => {
      const groups: string[] = ['team-a', 'team-b', 'team-c'];
      mockGroupsResponse = {
        apiVersion: 'v1',
        kind: 'User',
        metadata: {
          name: 'mock_user',
        },
        spec: {
          memberOf: groups,
        },
      };

      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });

      expect(response.status).toEqual(200);
      expect(response.body.groups).toEqual(groups);
    });

    it('returns ok empty groups', async () => {
      const groups: string[] = [];
      mockGroupsResponse = {
        apiVersion: 'v1',
        kind: 'User',
        metadata: {
          name: 'mock_user',
        },
        spec: {
          memberOf: groups,
        },
      };

      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });

      expect(response.status).toEqual(200);
      expect(response.body.groups).toEqual([]);
    });

    it('returns not ok error on groups', async () => {
      const groups: string[] = ['team-a', 'team-b', 'team-c'];
      mockGroupsResponse = {
        apiVersion: 'v1',
        kind: 'User',
        metadata: {
          name: 'mock_user',
        },
        spec: {
          memberOf: groups,
        },
      };
      breakAt('getUserGroups', new Error('error'));
      const response = await request(app)
        .get('/info')
        .query({ sso_email: 'mock.email@picpay.com' });

      expect(response.status).toEqual(500);
    });
  });
});
