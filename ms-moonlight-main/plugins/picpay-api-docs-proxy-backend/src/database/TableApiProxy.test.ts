import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { Knex as KnexType } from 'knex';
import { DatabaseApiProxy } from './ApiProxyRepository';

const requestMock: any = {
  identity: {
    userEntityRef: 'eibrunorodrigues',
    ownershipEntityRefs: [],
  },
  request: {
    url: 'https://backstage.io/catalog',
    method: 'GET',
    headers: {
      'content-type': 'application/json',
    },
  },
  date: '2023-11-07T00:00:00.000Z',
};

describe('Tablerequest', () => {
  const databases = TestDatabases.create({
    ids: ['POSTGRES_13', 'POSTGRES_9', 'SQLITE_3'],
  });

  const databaseId: TestDatabaseId = 'SQLITE_3';

  function createDatabaseManager(client: KnexType) {
    return {
      getClient: async () => client,
    };
  }

  async function createDatabaseHandler(): Promise<DatabaseApiProxy> {
    const knex = await databases.init(databaseId);
    const databaseManager = createDatabaseManager(knex);
    return await DatabaseApiProxy.create({ database: databaseManager });
  }

  it('should create new request', async () => {
    const databaseApiDocsProxy = await createDatabaseHandler();
    const requestData = {
      ...requestMock,
      request: {
        ...requestMock.request,
        url: 'https://moonlight.limbo.work/api/catalog',
      },
    };

    await databaseApiDocsProxy.apiProxyRepository().create(requestData);

    const res = await databaseApiDocsProxy
      .apiProxyRepository()
      .findByUser('eibrunorodrigues');

    expect(res).toHaveLength(1);
    console.info(res[0]);
    expect(res[0].identity.userEntityRef).toEqual('eibrunorodrigues');
    expect(res[0].request.url).toEqual(
      'https://moonlight.limbo.work/api/catalog',
    );
  });

  it('should delete request', async () => {
    const databaseNPS = await createDatabaseHandler();
    const repository = databaseNPS.apiProxyRepository();

    const requestData1 = {
      ...requestMock,
      request: {
        ...requestMock.request,
        url: 'https://moonlight.limbo.work/api/catalog',
      },
    };
    const requestData2 = {
      ...requestMock,
      request: {
        ...requestMock.request,
        url: 'https://moonlight.limbo.work/api/tasks',
      },
    };
    const requestData3 = {
      ...requestMock,
      request: {
        ...requestMock.request,
        url: 'https://ms-katchau-accelerate-metrics.ppay.me/health',
      },
    };

    await repository.create(requestData1);
    await repository.create(requestData2);
    await repository.create(requestData3);

    const requests = await repository.findAll();

    await expect(requests).toEqual([
      {
        ...requestData1,
        id: expect.anything(),
        date: expect.anything(),
        updated_at: null,
        response_status_code: null,
      },
      {
        ...requestData2,
        id: expect.anything(),
        date: expect.anything(),
        updated_at: null,
        response_status_code: null,
      },
      {
        ...requestData3,
        id: expect.anything(),
        date: expect.anything(),
        updated_at: null,
        response_status_code: null,
      },
    ]);

    for (const result of requests) {
      await repository.delete(result.id);
    }

    await expect(repository.findAll()).resolves.toEqual([]);
  });

  it('should update request', async () => {
    const databaseNPS = await createDatabaseHandler();
    const repository = databaseNPS.apiProxyRepository();

    const requestData = {
      ...requestMock,
      request: {
        ...requestMock.request,
        url: 'https://wrong.url',
      },
    };

    await repository.create(requestData);
    const result = await repository.findByUser('eibrunorodrigues');

    expect(result).toHaveLength(1);
    expect(result[0].request.url).toEqual('https://wrong.url');

    await repository.update(result[0].id, {
      id: 'test123',
      request: {
        ...requestMock.request,
        url: 'https://right.url',
      },
    });

    const resultUpdate = await repository.findByUser('eibrunorodrigues');

    expect(resultUpdate).toHaveLength(1);
    expect(resultUpdate[0].request.url).toEqual('https://right.url');
  });
});
