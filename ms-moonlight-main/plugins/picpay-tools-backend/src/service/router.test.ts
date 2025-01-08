/*
 * Copyright 2022 The Backstage Authors
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
import { GetExploreToolsRequest } from '@backstage-community/plugin-explore-common';
import express from 'express';
import request from 'supertest';
import { CustomExploreTool, CustomProvider } from '../tools';
import { createRouter } from './router';

const mockTools: CustomExploreTool[] = [
  {
    categoryName: 'TYPE',
    categoryType: 'TYPE',
    categoryTools: [
      {
        id: 'aaa-aaa',
        title: 'Tool 1',
        description: 'Description 1',
        productUrl: 'https://example1.com/',
        typeInterface: 'Type 1',
      },
      {
        id: 'bbb-bbb',
        title: 'Tool 2',
        description: 'Description 2',
        productUrl: 'https://example2.com',
        typeInterface: 'Type 2',
      },
    ],
  },
];

describe('createRouter', () => {
  let app: express.Express;
  const toolProvider: CustomProvider = {
    getTools: async ({}: GetExploreToolsRequest) => {
      return {
        tools: mockTools,
      };
    },
  };

  beforeAll(async () => {
    const router = await createRouter({
      logger: getVoidLogger(),
      toolProvider,
    });
    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe('GET Tools', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual(
        expect.objectContaining({ tools: mockTools }),
      );
    });
  });
});
