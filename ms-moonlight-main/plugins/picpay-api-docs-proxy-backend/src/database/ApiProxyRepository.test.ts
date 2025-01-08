/*
 * Copyright 2021 The Backstage Authors
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

import { DatabaseApiProxy } from './ApiProxyRepository';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { Knex as KnexType } from 'knex';

describe('DatabaseNPS', () => {
  const databases = TestDatabases.create({
    ids: ['POSTGRES_13', 'POSTGRES_9', 'SQLITE_3'],
  });

  function createDatabaseManager(client: KnexType) {
    return {
      getClient: async () => client,
    };
  }

  async function createDatabaseHandler(databaseId: TestDatabaseId) {
    const knex = await databases.init(databaseId);
    const databaseManager = createDatabaseManager(knex);
    return {
      knex,
      dbHandler: await DatabaseApiProxy.create({ database: databaseManager }),
    };
  }

  it.each(databases.eachSupportedId())(
    'should insert and get a request, %p',
    async databaseId => {
      const { knex, dbHandler } = await createDatabaseHandler(databaseId);

      await knex('requests').insert({
        id: 'test',
        identity: {
          userEntityRef: 'eibrunorodrigues',
        },
        request: {
          url: 'https://backstage.io/catalog',
          method: 'GET',
          headers: {
            'content-type': 'application/json',
          },
        },
        date: '2023-11-07T00:00:00.000Z',
      });

      const res = await dbHandler
        .apiProxyRepository()
        .findByUser('eibrunorodrigues');

      expect(res).toHaveLength(1);
      expect(res[0].identity.userEntityRef).toEqual('eibrunorodrigues');
      expect(res[0].request.url).toEqual('https://backstage.io/catalog');
    },
    60_000,
  );
});
