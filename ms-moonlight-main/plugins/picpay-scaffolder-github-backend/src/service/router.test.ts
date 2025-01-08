import express from 'express';
import { createRouter } from './router';
import request from 'supertest';
import { ConfigReader } from '@backstage/config';
import { getVoidLogger } from '@backstage/backend-common';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';
import { CatalogApi } from '@backstage/plugin-catalog-react';

const mockOctokit = {
  rest: {
    repos: {
      getContent: jest.fn(),
    },
  },
};
jest.mock('octokit', () => ({
  Octokit: class {
    constructor() {
      return mockOctokit;
    }
  },
}));

describe('createRouterGithub', () => {
  let app: express.Express;
  const MOCK = {
    rings: [
      {
        id: 'adopt',
        name: 'ADOPT',
        color: '#93c47d',
      },
      {
        id: 'trial',
        name: 'TRIAL',
        color: '#93d2c2',
      },
      {
        id: 'assess',
        name: 'ASSESS',
        color: '#fbdb84',
      },
      {
        id: 'hold',
        name: 'HOLD',
        color: '#efafa9',
      },
    ],
    quadrants: [
      {
        id: 'techniques',
        name: 'Techniques',
      },
      {
        id: 'languages',
        name: 'Languages and Frameworks',
      },
      {
        id: 'tools',
        name: 'Tools',
      },
      {
        id: 'platforms',
        name: 'Platforms',
      },
    ],
    entries: [
      {
        timeline: [
          {
            moved: 0,
            ringId: 'adopt',
            date: '2023-03-03T00:00:00.000Z',
          },
        ],
        url: 'https://picpay.atlassian.net/wiki/spaces/DevEX/pages/2330755610',
        key: 'tekton',
        id: 'tekton',
        title: 'Tekton',
        quadrant: 'platforms',
        description:
          'O Tekton é o framework usado para criação da Moonlight Pipeline, como solução de CI (continuous integration) da instituição, onde basicamente todos os elementos são objetos do Kubernetes',
        license: 'Open Source',
        version: '',
        links: [
          {
            url: 'https://picpay.atlassian.net/wiki/spaces/DevEX/pages/2330755610',
            title: 'Documentação',
          },
          {
            url: 'https://tekton.dev/',
            title: 'Site',
          },
        ],
      },
    ],
  };

  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  const databaseId: TestDatabaseId = 'SQLITE_3';

  const catalogApi: jest.Mocked<CatalogApi> = {
    getEntities: jest.fn().mockResolvedValue({
      data: [{ metadata: { uid: '7eb35d3a-de26-43d2-9fde-294e3152ec2a' } }],
    }),
  } as any;

  beforeAll(async () => {
    const knex = await databases.init(databaseId);

    const router = await createRouter({
      logger: getVoidLogger(),
      config: new ConfigReader({}),
      database: {
        getClient: async () => {
          return knex;
        },
      },
      catalogApi: catalogApi,
    });
    app = express().use(router);
  });

  it('should get file with sucess', async () => {
    mockOctokit.rest.repos.getContent.mockResolvedValueOnce({
      data: {
        content: new Buffer(JSON.stringify(MOCK)).toString('base64'),
      },
      status: 200,
    });

    const response = await request(app).get('/file/arqr-tech-radar/data.json');
    expect(response.status).toEqual(200);
    expect(response.body).toEqual(MOCK);
  });
});
