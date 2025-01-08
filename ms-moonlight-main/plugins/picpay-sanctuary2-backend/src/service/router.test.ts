import { ConfigReader } from '@backstage/config';
import { Logger } from 'winston';
import { PluginEndpointDiscovery } from '@backstage/backend-common';
import { CatalogApi } from '@backstage/catalog-client';
import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { getVoidLogger } from '@backstage/backend-common';
import { EntityProperty } from './EntityProperty';
import { FausthanosClient } from './fausthanosClient';

const fausthanosMockClient = {
  createAction: jest.fn().mockResolvedValue({ status: 'success' }),

  getStatus: jest.fn().mockImplementation((componentId: string) => {
    if (componentId === '1') {
      return Promise.resolve({
        error: false,
      });
    }
    return Promise.resolve({
      error: true,
    });
  }),

  getStatusByID: jest.fn().mockImplementation((statusId: string) => {
    if (statusId === '1') {
      return Promise.resolve({
        error: false,
      });
    }
    return Promise.resolve({
      error: true,
    });
  }),

  getAll: jest.fn().mockResolvedValue([
    {
      component: {
        id: '1',
        name: 'test-component',
      },
    },
    {
      component: {
        id: '2',
        name: 'test-component',
      },
    },
  ]),
}
const entityPropertyMock = {
  hasEntity: jest.fn().mockImplementation((componentId: string) => {
    if (componentId === '1') {
      return Promise.resolve(true);
    }
    return Promise.resolve(false);
  }),

  getOwner: jest.fn().mockImplementation((componentId: string) => {
    if (componentId === '1') {
      return Promise.resolve({
        group: 'test-group',
        owner: 'test-owner',
      });
    }
    return Promise.resolve({
      group: '',
      owner: '',
    });
  }),

  getMembersGroup: jest.fn().mockImplementation((owner: string) => {
    if (owner === 'test-group') {
      return Promise.resolve(['test-reviewer1', 'test-reviewer2']);
    }
    return Promise.resolve([]);
  }),

  getReviewersByGroup: jest.fn().mockImplementation((group: string) => {
    if (group === 'test-group') {
      return Promise.resolve([
        { githubProfile: 'test-profile', email: 'test-email' },
        { githubProfile: 'test-profile2', email: 'test-email2' },
      ]);
    }
    return Promise.resolve([]);
  }),

  getRequesterEntity: jest.fn(),
  token: '',
}
jest.mock('./fausthanosClient', () => {
  return {
    FausthanosClient: jest.fn().mockImplementation(() => {
      return fausthanosMockClient;
    }),
  };
});

jest.mock('./EntityProperty', () => {
  return {
    EntityProperty: jest.fn().mockImplementation(() => {
      return entityPropertyMock;
    }),
  };
});

jest.mock('@backstage/plugin-auth-node', () => {
  return {
    IdentityClient:  {
        create: jest.fn(),
      },
      getBearerTokenFromAuthorizationHeader: jest.fn()
  };
});

describe('createRouter', () => {
  let api: FausthanosClient;
  let app: express.Express;
  let config: ConfigReader;
  let logger: Logger;
  let catalog: CatalogApi;
  let discovery: PluginEndpointDiscovery;
  let entityProperty: EntityProperty;

  beforeEach(async () => {
    config = new ConfigReader({
      backend: {
        baseUrl: 'http://localhost:7000',
      },
      options: {
        token: 'token',
      },
    });
    logger = getVoidLogger();
    catalog = {} as CatalogApi;
    discovery = {} as PluginEndpointDiscovery;
    entityProperty = new EntityProperty({} as any);
    api = new FausthanosClient({ config, logger });

    const router = await createRouter({ config, logger, catalog, discovery });
    app = express();
    app.use(router);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should handle /health, with return 200', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok' });
  });

  it('Should handle /validate-entity/:componentId, with return 404', async () => {
    entityProperty.hasEntity('2');

    const response = await request(app)
      .get('/validate-entity/2')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ data: 'Record not found' });
  });

  it('Should handle /validate-entity/:componentId, with return 200', async () => {
    entityProperty.hasEntity('1');

    const response = await request(app)
      .get('/validate-entity/1')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ data: '1' });
  });

  it('Should handle /validate-owner/:componentId, with return 404', async () => {
    entityProperty.getOwner('2', 'Component');

    const response = await request(app)
      .get('/validate-owner/2')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ data: 'Record not found' });
  });

  it('Should handle /validate-owner/:componentId, with return 200', async () => {
    entityProperty.getOwner('1', 'Component');
    entityProperty.getMembersGroup('test-group');

    const response = await request(app)
      .get('/validate-owner/1')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      group: 'test-group',
      owner: 'test-owner',
      reviewers: [{
        "email": "test-email",
        "githubProfile": "test-profile",
      },
      {
        "email": "test-email2",
        "githubProfile": "test-profile2",
      }],
    });
  });

  it('Should handle /component/:componentId, with return 200 and without status error', async () => {
    api.getStatus('1');

    const response = await request(app)
      .get('/component/1')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      error: false,
    });
  });

  it('Should handle /component/:componentId, with return 404, with status error and without component, group, owner and reviewers', async () => {
    api.getStatus('2');
    entityProperty.hasEntity('2');
    entityProperty.getOwner('2', 'Component');
    entityProperty.getMembersGroup('');

    const response = await request(app)
      .get('/component/2')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      data: 'COMPONENT_NOT_FOUND',
    });
  });

  it('Should handle /component/:componentId, with return 200, without status error and with component, group, owner and reviewers', async () => {
    api.getStatus('1');
    entityProperty.hasEntity('1');
    entityProperty.getOwner('1', 'Component');
    entityProperty.getMembersGroup('test-group');

    const response = await request(app)
      .get('/component/1')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      error: false,
    });
  });

  it('Should handle /status/:statusId, with return 200 without status error', async () => {
    api.getStatusByID('1');

    const response = await request(app)
      .get('/status/1')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ error: false });
  });

  it('Should handle /components, with return 200', async () => {
    api.getAll();

    const response = await request(app)
      .get('/components')
      .set('Authorization', 'Bearer token');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      data: [
        { component: { id: '1', name: 'test-component' } },
        { component: { id: '2', name: 'test-component' } },
      ]
    });
  });
 
  it('Should handle POST /component, with return 200', async () => {
    entityPropertyMock.getRequesterEntity.mockResolvedValue({
      metadata: {
        name: 'test-email',
      },
      spec: {
        github: {
          login: 'gh-login',
        },
        profile: {
          email: 'email@picpay.com',
        }
      }
    })

    const response = await request(app)
      .post('/component')
      .set('Authorization', 'Bearer token')
      .send({
        component: {
          id: '1',
          kind: 'Component',
          name: 'test-component',
        },
      });

      
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success' });
    expect(fausthanosMockClient.createAction).toHaveBeenCalledWith({
      component: {
        id: '1',
        kind: 'Component',
        name: 'test-component',
      },
      requestedBy: "gh-login",
      type: "delete",
      owner: 'test-owner',
      reviewers: [
        { email: 'test-email', githubProfile: 'test-profile' },
        { email: 'test-email2', githubProfile: 'test-profile2' },
      ],
    });

  });

  it('Should handle POST /component, with return 200 when github is not avaliable', async () => {
    entityPropertyMock.getRequesterEntity.mockResolvedValue({
      metadata: {
        name: 'test-email',
      },
      spec: {
        profile: {
          email: 'email@picpay.com',
        }
      }
    })

    const response = await request(app)
      .post('/component')
      .set('Authorization', 'Bearer token')
      .send({
        component: {
          id: '1',
          kind: 'Component',
          name: 'test-component',
        },
      });

      
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success' });
    expect(fausthanosMockClient.createAction).toHaveBeenCalledWith({
      component: {
        id: '1',
        kind: 'Component',
        name: 'test-component',
      },
      requestedBy: "email@picpay.com",
      type: "delete",
      owner: 'test-owner',
      reviewers: [
        { email: 'test-email', githubProfile: 'test-profile' },
        { email: 'test-email2', githubProfile: 'test-profile2' },
      ],
    });

  });

  it('Should handle POST /component, with return 200 when name when other info is not avaliable', async () => {
    entityPropertyMock.getRequesterEntity.mockResolvedValue({
      metadata: {
        name: 'test-email',
      },
      spec: {
      }
    })

    const response = await request(app)
      .post('/component')
      .set('Authorization', 'Bearer token')
      .send({
        component: {
          id: '1',
          kind: 'Component',
          name: 'test-component',
        },
      });

      
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'success' });
    expect(fausthanosMockClient.createAction).toHaveBeenCalledWith({
      component: {
        id: '1',
        kind: 'Component',
        name: 'test-component',
      },
      requestedBy: "test-email",
      type: "delete",
      owner: 'test-owner',
      reviewers: [
        { email: 'test-email', githubProfile: 'test-profile' },
        { email: 'test-email2', githubProfile: 'test-profile2' },
      ],
    });

  });


  it('Should handle POST /component, with return 404 when group or owner not found', async () => {
    const response = await request(app)
      .post('/component')
      .set('Authorization', 'Bearer token')
      .send({
        component: {
          id: '2',
          kind: 'Component',
          name: 'test-component',
        },
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ data: 'GROUP_OWNER_NOT_FOUND' });
  });

  it('Should handle POST /component, with return 404 when reviewers not found', async () => {
    entityPropertyMock.getReviewersByGroup.mockResolvedValue([]);

    const response = await request(app)
      .post('/component')
      .set('Authorization', 'Bearer token')
      .send({
        component: {
          id: '1',
          kind: 'Component',
          name: 'test-component',
        },
      });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ data: 'REVIEWERS_NOT_FOUND' });
  });

});
