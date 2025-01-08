import { mockServices } from '@backstage/backend-test-utils';
import { CatalogApi, CatalogClient } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { DatabaseManager } from '@backstage/backend-defaults/database'
import { DatabaseService } from '@backstage/backend-plugin-api';
import { ConfigReader } from '@backstage/config';
import express from 'express';
import request from 'supertest';
import { Database } from '../database/Database';
import { createRouter } from './router';
import { REPO_RULES } from '../database/tables';
import mountTreeByEntityName from '@internal/plugin-picpay-entity-tree-backend';
import { hasNonDefaultNamespaceParents, validateDate } from './service';

jest.mock('@internal/plugin-picpay-entity-tree-backend');
jest.mock('./service', () => ({
  ...jest.requireActual('./service'),
  validateDate: jest.fn(),
}));

const createDatabase = (): DatabaseService => {
  return DatabaseManager.fromConfig(
      new ConfigReader({
          backend: {
              database: {
                  client: 'better-sqlite3',
                  connection: ':memory:',
              },
          },
      }),
  ).forPlugin('picpay-repository-rules');
}

const entity1: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
      name: 'mes-test-1',
      namespace: 'picpay',
  },
  spec: {
      lifecycle: 'production',
      owner: 'team-1',
      type: 'service',
  },
}

const entity2: Entity = {
  apiVersion: 'backstage.io/v1alpha1',
  kind: 'Component',
  metadata: {
      name: 'ms-test-2',
      namespace: 'picpay',
  },
  spec: {
      lifecycle: 'production',
      owner: 'team-1',
      type: 'service',
  },
}

const entities = [entity1, entity2]

const mockData = {
  name: "squad-atlantis",
  description: "Squad Atlantis description",
  kind: "Group",
  namespace: "default",
  type: "team",
  parents: [
    {
      name: "developer_experience",
      description: "Developer Experience",
      kind: "Group",
      namespace: "default",
      type: "business-unit",
      parents: [],
    },
    {
      name: "squad-atlantis",
      description: "Squad responsible for Moonlight, Github, Copilot",
      kind: "Group",
      namespace: "picpay",
      type: "squad",
      parents: [
        {
          name: "tribe-developer-experience",
          description: "Tribe of Developer Experience",
          kind: "Group",
          namespace: "picpay",
          type: "tribe",
          parents: [],
        },
      ],
    },
  ],
};

describe('createRouter', () => {
  let app: express.Express;
  let mockCatalog: jest.Mocked<CatalogClient>;
  const database = createDatabase();

  beforeAll(async () => {
    const mockMountTreeByEntityName = mountTreeByEntityName as jest.MockedFunction<typeof mountTreeByEntityName>;

    mockMountTreeByEntityName.mockImplementation(
      async (
        _catalog: CatalogApi,
        name: string,
        namespace: string = 'default',
        kind: string = 'Component',
      ) => {
        if (name === 'not-found') {
          return null;
        }

        return {
          name,
          namespace,
          kind,
          data: 'mocked data',
          parents: [],
        };
      },
    );

    mockCatalog = {
      getEntities: jest.fn(),
    } as any;

    const router = await createRouter({
      logger: mockServices.logger.mock(),
      config: mockServices.rootConfig(),
      catalog: mockCatalog,
      database: await Database.create({ database }),
      daysEnv: 10,
    });

    app = express().use(router);
  });

  beforeEach(() => {
    jest.resetAllMocks();
  });

  afterEach(async () => {
    const client = await database.getClient();
    await client.delete('*').from(REPO_RULES);
  })

  afterAll(async () => {
    jest.resetAllMocks();
    jest.clearAllTimers();
  });

  describe('GET /health', () => {
    it('returns ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toEqual(200);
      expect(response.body).toEqual({ status: 'ok' });
    });
  });

  describe('GET /owner-parents/:repository', () => {
    it('returns 404 if repository is not found', async () => {
      mockCatalog.getEntities.mockResolvedValueOnce({ items: [] });
      const response = await request(app).get('/owner-parents/nonexistent-repo');
  
      expect(response.status).toEqual(404);
      expect(mockCatalog.getEntities).toHaveBeenCalledWith({
        filter: { 'kind': 'Component', 'metadata.name': 'nonexistent-repo' },
        fields: ['spec'],
        limit: 1,
      });
      expect(mockCatalog.getEntities).toHaveBeenCalledTimes(1);
    });


    it('returns the repository data if it exists and is not expired', async () => {
      mockCatalog.getEntities.mockResolvedValueOnce({ items: entities });
      (validateDate as jest.Mock).mockReturnValue(false);

      const response = await request(app).get('/owner-parents/ms-test-2').send();
      const hasNoDefaultNamespaceParents = hasNonDefaultNamespaceParents(mockData);
      expect(response.status).toBe(200);
      expect(mountTreeByEntityName).toHaveBeenCalledWith(mockCatalog, 'ms-test-2', 'default');
      expect(hasNoDefaultNamespaceParents).toBe(true);
      expect(response.body).toEqual({status: 'NOT_EXPIRED'});
      expect(mockCatalog.getEntities).toHaveBeenCalledWith({
        filter: { 'kind': 'Component', 'metadata.name': 'ms-test-2' },
        fields: ['spec'],
        limit: 1,
      });
    });
  });
});
