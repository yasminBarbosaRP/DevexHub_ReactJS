import { Database } from './Database';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { v4 as uuid } from 'uuid';
import { Knex as KnexType } from 'knex';
import {  RepoRules } from './tables';

const repoRules: RepoRules = {
  id: uuid(),
  repository: 'ms-test',
  team: 'team-test',
  until_date: new Date(),
};

describe('Database', () => {
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
      db: await Database.create({ database: databaseManager }),
    };
  }

  it.each(databases.eachSupportedId())
    ('should insert and get repo rules, %p',async databaseId => {
      const { knex, db } = await createDatabaseHandler(databaseId);

      await knex('repo_rules').insert({
        id: repoRules.id,
        repository: repoRules.repository,
        team: repoRules.team,
        until_date: repoRules.until_date.toISOString(),
      });

      const res = await db.repository().getByRepository(repoRules.repository);
      res.until_date = new Date(res.until_date);


      expect(res).toMatchObject<RepoRules>(repoRules);
      expect(res.repository).toEqual(repoRules.repository);
      expect(res.team).toEqual(repoRules.team);
      expect(res.until_date).toEqual(repoRules.until_date);
    },
    60_000,
  );
});
