import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { Knex as KnexType } from 'knex';
import { DatabaseNPS } from './DatabaseNPS';

const survey: any = {
  route: 'catalog',
  start_date: '2022-03-01T00:00:00.000Z',
  end_date: '2022-03-11T23:59:59.000Z',
};

describe('TableSurvey', () => {
  const databases = TestDatabases.create({
    ids: ['POSTGRES_13', 'POSTGRES_9', 'SQLITE_3'],
  });

  const databaseId: TestDatabaseId = 'SQLITE_3';

  function createDatabaseManager(client: KnexType) {
    return {
      getClient: async () => client,
    };
  }

  async function createDatabaseHandler(): Promise<DatabaseNPS> {
    const knex = await databases.init(databaseId);
    const databaseManager = createDatabaseManager(knex);
    return await DatabaseNPS.create({ database: databaseManager });
  }

  it('should create new survey', async () => {
    const databaseNPS = await createDatabaseHandler();
    const surveyData = {
      title: 'title 1',
      ...survey,
    };

    await databaseNPS.surveyRepository().add(surveyData);

    const res = await databaseNPS
      .surveyRepository()
      .find({ title: surveyData.title });

    expect(res).toHaveLength(1);
    expect(res[0].title).toEqual('title 1');
    expect(res[0].route).toEqual('catalog');
    expect(res[0].start_date).toEqual('2022-03-01T00:00:00.000Z');
    expect(res[0].end_date).toEqual('2022-03-11T23:59:59.000Z');
  });

  it('should delete survey', async () => {
    const databaseNPS = await createDatabaseHandler();
    const repository = databaseNPS.surveyRepository();

    const surveyData1 = { title: 'title 1', description: null, ...survey };
    const surveyData2 = { title: 'title 2', description: 'Desc 1', ...survey };
    const surveyData3 = { title: 'title 3', description: 'Desc 2', ...survey };

    await repository.add(surveyData1);
    await repository.add(surveyData2);
    await repository.add(surveyData3);

    const surveys = repository.findAll();

    await expect(surveys).resolves.toEqual([
      {
        ...surveyData1,
        id: expect.anything(),
        created_at: expect.anything(),
        updated_at: expect.anything(),
      },
      {
        ...surveyData2,
        id: expect.anything(),
        created_at: expect.anything(),
        updated_at: expect.anything(),
      },
      {
        ...surveyData3,
        id: expect.anything(),
        created_at: expect.anything(),
        updated_at: expect.anything(),
      },
    ]);

    const surveysDelete = await repository.findAll();

    for (const result of surveysDelete) {
      await repository.delete(result.id);
    }

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('should update survey', async () => {
    const databaseNPS = await createDatabaseHandler();
    const repository = databaseNPS.surveyRepository();

    const surveyData = { title: 'wrong title', ...survey };

    await repository.add(surveyData);
    const result = await repository.find({ title: surveyData.title });

    expect(result).toHaveLength(1);
    expect(result[0].title).toEqual('wrong title');

    await repository.change(result[0].id, {
      id: 'test123',
      title: 'right title',
      route: 'home',
    });

    const resultUpdate = await repository.find({ title: 'right title' });

    expect(resultUpdate).toHaveLength(1);
    expect(resultUpdate[0].title).toEqual('right title');
    expect(resultUpdate[0].route).toEqual('home');
  });
});
