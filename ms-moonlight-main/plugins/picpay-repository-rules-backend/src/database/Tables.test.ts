import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { Knex as KnexType } from 'knex';
import { v4 as uuid } from 'uuid';
import {  RepoRules } from './tables';
import { Database } from './Database';

describe('RepoRulesTable', () => {
  const databases = TestDatabases.create({
    ids: ['POSTGRES_13', 'POSTGRES_9', 'SQLITE_3'],
  });

  const databaseId: TestDatabaseId = 'SQLITE_3';

  function createDatabaseManager(client: KnexType) {
    return {
      getClient: async () => client,
    };
  }

  async function createDatabaseHandler(): Promise<Database> {
    const knex = await databases.init(databaseId);
    const databaseManager = createDatabaseManager(knex);
    return await Database.create({ database: databaseManager });
  }

  it('should insert table repo_rules', async () => {
    const repoRules: RepoRules = {
      id: uuid(),
      repository: 'ms-test',
      team: 'team-test',
      until_date: new Date(),
    };

    const database = await createDatabaseHandler();
    await database.repository().save(repoRules);

    const res = await database.repository().getByRepository(repoRules.repository);
    res.until_date = new Date(res.until_date);

    expect(res).toMatchObject<RepoRules>(repoRules);
    expect(res.repository).toEqual(repoRules.repository);
    expect(res.team).toEqual(repoRules.team);
    expect(res.until_date).toEqual(repoRules.until_date);
  });

  it('should delete repo_rules', async () => {
    const database = await createDatabaseHandler();
    const repository = database.repository();

    const repoRules1: RepoRules = {
      id: uuid(),
      repository: 'ms-test1',
      team: 'team-test',
      until_date: new Date(),
    };

    const repoRules2: RepoRules = {
      id: uuid(),
      repository: 'ms-test2',
      team: 'team-test',
      until_date: new Date(),
    };

    const repoRules3: RepoRules = {
      id: uuid(),
      repository: 'ms-test3',
      team: 'team-test',
      until_date: new Date(),
    };

    await repository.save(repoRules1);
    await repository.save(repoRules2);
    await repository.save(repoRules3);

    const results = repository.findAll();

    await expect(results).resolves.toEqual([
      {
        ...repoRules1,
        until_date: expect.anything(),
      },
      {
        ...repoRules2,
        until_date: expect.anything(),
      },
      {
        ...repoRules3,
        until_date: expect.anything(),
      },
    ]);

    const repos = await repository.findAll();

    for (const repo of repos) {
      await repository.deleteByRepository(repo.repository);
    }

    await expect(repository.findAll()).resolves.toEqual([]);
  });
});
