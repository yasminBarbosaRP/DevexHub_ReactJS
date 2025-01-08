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

import { DatabaseNPS } from './DatabaseNPS';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { v4 as uuid } from 'uuid';
import { Knex as KnexType } from 'knex';

const survey: any = {
  id: uuid(),
  title: 'survey`s title',
  route: 'catalog',
  startDate: '2022-03-01T00:00:00.000Z',
  endDate: '2022-03-11T23:59:59.000Z',
};

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
      dbHandler: await DatabaseNPS.create({ database: databaseManager }),
    };
  }

  it.each(databases.eachSupportedId())(
    'should insert and get survey, %p',
    async databaseId => {
      const { knex, dbHandler } = await createDatabaseHandler(databaseId);

      await knex('surveys').insert({
        id: survey.id,
        title: survey.title,
        route: survey.route,
        start_date: survey.startDate,
        end_date: survey.endDate,
      });

      const res = await dbHandler
        .surveyRepository()
        .find({ title: survey.title });

      expect(res).toHaveLength(1);
      expect(res[0].title).toEqual('survey`s title');
      expect(res[0].route).toEqual('catalog');
      expect(res[0].start_date).toEqual('2022-03-01T00:00:00.000Z');
      expect(res[0].end_date).toEqual('2022-03-11T23:59:59.000Z');
    },
    60_000,
  );
});
