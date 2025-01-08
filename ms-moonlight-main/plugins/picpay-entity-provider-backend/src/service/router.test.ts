import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { ConfigReader } from '@backstage/config';
import { mockServices } from '@backstage/backend-test-utils';
import { Database } from '../database/Database';
import { CatalogApi } from '@backstage/catalog-client';
import { DatabaseManager } from '@backstage/backend-defaults/database'
import { DatabaseService } from '@backstage/backend-plugin-api';
import { EXTENSION_ENTERPRISE } from './scim';
import { ADDITIONAL_INFORMATION_TABLE, EVENTS_TABLE, MEMBERS_TABLE, MICROSOFT_AD_TABLE } from '../database/tables';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

function createDatabase(): DatabaseService {
    return DatabaseManager.fromConfig(
        new ConfigReader({
            backend: {
                database: {
                    client: 'better-sqlite3',
                    connection: ':memory:',
                },
            },
        }),
    ).forPlugin('picpay-entity-provider');
}

describe('createRouter', () => {
    let app: express.Express;
    const database = createDatabase();
    const catalogApi: jest.Mocked<CatalogApi> = {
        getLocationById: jest.fn(),
        getEntityByName: jest.fn(),
        getEntityByRef: jest.fn(),
        getEntities: jest.fn(async () => ({
            items: [],
        })),
        addLocation: jest.fn(),
        getLocationByRef: jest.fn(),
        removeEntityByUid: jest.fn(),
    } as any;
    const logger = mockServices.logger.mock();
    beforeAll(async () => {
        const router = await createRouter({
            config: new ConfigReader({
                integrations: {},
                backend: {
                    baseUrl: 'http://mock-backend'
                },
                picpayEntityProvider: {
                    callbacks: {
                        template: {
                            notModifiedTemplate: "notModified",
                            modified: "modified",
                            replaced: "replaced"
                        }
                    },
                    microsoftAD: {
                        scimToken: 'test'
                    }
                }
            }),
            logger,
            database: await Database.create(database, database),
            catalogApi: catalogApi,
            scheduler: mockServices.scheduler.mock(),
        });
        app = express().use(router);
    });

    beforeEach(() => {
        jest.resetAllMocks();
        fetchMock.resetMocks();
    });

    afterEach(async () => {
        const client = await database.getClient();
        for (const table of [MICROSOFT_AD_TABLE, MEMBERS_TABLE, EVENTS_TABLE, ADDITIONAL_INFORMATION_TABLE]) {
            await client.delete('*').from(table);
        }
    })

    describe('POST /additional-information/webhooks/members', () => {
        it('should save with simple group and then save a member', async () => {

            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-atlantis']
                });
            expect(response.status).toBe(204);
            const group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');
            const responseMembers = await request(app)
                .post('/additional-information/webhooks/members')
                .send({
                    "leadRef": "user:picpay/cleber-mendes",
                    "userRef": "user:picpay/marcella-farias",
                    "leadEmail": "cleber.mendes@picpay.com",
                    "group": {
                        "name": "squad-atlantis"
                    }
                });
            expect(responseMembers.status).toBe(202);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('http://mock-backend/api/slack/notify');
            expect(fetchMock.mock.calls[0][1]?.body).toContain('modified');
        })
        it('should save with simple group, save a member and try to save the same group', async () => {

            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-atlantis']
                });
            expect(response.status).toBe(204);
            const group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');
            let responseMembers = await request(app)
                .post('/additional-information/webhooks/members')
                .send({
                    "leadRef": "user:picpay/cleber-mendes",
                    "userRef": "user:picpay/marcella-farias",
                    "leadEmail": "cleber.mendes@picpay.com",
                    "group": {
                        "name": "squad-atlantis"
                    }
                });
            expect(responseMembers.status).toBe(202);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('http://mock-backend/api/slack/notify');
            expect(fetchMock.mock.calls[0][1]?.body).toContain('modified');

            responseMembers = await request(app)
                .post('/additional-information/webhooks/members')
                .send({
                    "leadRef": "user:picpay/cleber-mendes",
                    "userRef": "user:picpay/marcella-farias",
                    "leadEmail": "cleber.mendes@picpay.com",
                    "group": {
                        "name": "squad-atlantis"
                    }
                });
            expect(responseMembers.status).toBe(204);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock.mock.calls[1][0]).toBe('http://mock-backend/api/slack/notify');
            expect(fetchMock.mock.calls[1][1]?.body).toContain('notModified');

        })
        it('should save with simple group, save a member then switch group', async () => {

            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })

            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-test-eng",
                    namespace: "default",
                    description: "Squad test-eng",
                },
                spec: {
                    type: 'team'
                },
            })
            let response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-atlantis']
                });
            expect(response.status).toBe(204);
            let group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');


            response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-test-eng',
                    displayName: 'test-eng',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-test-eng']
                });
            expect(response.status).toBe(204);
            group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data.length).toBe(2);

            let responseMembers = await request(app)
                .post('/additional-information/webhooks/members')
                .send({
                    "leadRef": "user:picpay/cleber-mendes",
                    "userRef": "user:picpay/marcella-farias",
                    "leadEmail": "cleber.mendes@picpay.com",
                    "group": {
                        "name": "squad-atlantis"
                    }
                });
            expect(responseMembers.status).toBe(202);
            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('http://mock-backend/api/slack/notify');
            expect(fetchMock.mock.calls[0][1]?.body).toContain('modified');

            responseMembers = await request(app)
                .post('/additional-information/webhooks/members')
                .send({
                    "leadRef": "user:picpay/cleber-mendes",
                    "userRef": "user:picpay/marcella-farias",
                    "leadEmail": "cleber.mendes@picpay.com",
                    "group": {
                        "name": "squad-test-eng"
                    }
                });
            expect(responseMembers.status).toBe(202);
            expect(fetchMock).toHaveBeenCalledTimes(2);
            expect(fetchMock.mock.calls[1][1]?.body).toContain('replaced');

        })
    })

    describe('POST,PATCH /additional-information', () => {
        it('should save with simple github name', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-atlantis']
                });
            expect(response.status).toBe(204);
            const group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');
        })

        it('should reject due unexisting github group', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['squad-atlantis']
                });
            expect(response.status).toBe(400);
            // @ts-ignore
            expect(response.error.text).toContain(`Github team 'squad-atlantis' does not exist`);
        })

        it('should reject due unexpected type of github on body', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: [99]
                });
            expect(response.status).toBe(400);
            // @ts-ignore
            expect(response.error.text).toContain(`Github teams must be an array of strings`);
        })

        it('should reject due unexpected kind of entity', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['component:default/ms-moonlight']
                });
            expect(response.status).toBe(400);
            // @ts-ignore
            expect(response.error.text).toContain(`Github team 'component:default/ms-moonlight' must be a group entityref`);
        })

        it('should save with entityref as github name', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })
            const response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['group:default/squad-atlantis']
                });
            expect(response.status).toBe(204);
            const group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');
        })

        it('should save wrong github team then fix it', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "Cleber Mendes",
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-cicd",
                    namespace: "default",
                    description: "Squad CiCD",
                },
                spec: {
                    type: 'team'
                },
            })
            let response = await request(app)
                .post('/additional-information')
                .send({
                    identifier: 'picpay/cleber-mendes',
                    name: 'squad-atlantis',
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    githubTeams: ['group:default/squad-cicd']
                });
            expect(response.status).toBe(204);
            let group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-cicd');

            // fix the github group
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "Group",
                metadata: {
                    name: "squad-atlantis",
                    namespace: "default",
                    description: "Squad Atlantis",
                },
                spec: {
                    type: 'team'
                },
            })
            response = await request(app)
                .patch(`/additional-information/${group.body.data[0].id}`)
                .send({
                    githubTeams: ['group:default/squad-atlantis']
                });
            expect(response.status).toBe(204);
            group = await request(app)
                .get('/additional-information?entityRef=group:picpay/cleber-mendes')
                .send();
            expect(group.statusCode).toBe(200);
            expect(group.body.data[0].content?.spec?.children).not.toContain('group:default/squad-cicd');
            expect(group.body.data[0].content?.spec?.children).toContain('group:default/squad-atlantis');
        })
    });

    describe('POST /scim/v2/Users', () => {
        it('should return 401 if authorization header isnt provided', async () => {
            const response = await request(app)
                .post('/scim/v2/Users')
                .send();
            expect(response.status).toBe(401);
        });
        it('should return 400 if authorization header is provided but no data', async () => {
            const response = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send();
            expect(response.status).toBe(400);
        });
        it('should return 200 after sending user', async () => {
            const response = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Diego Sana", "givenName": "Diego", "familyName": "Sana" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "diego.sana@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "diego.sana@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "diego.sana", "displayName": "Diego Sana", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(response.status).toBe(200);
        })

        it('create user then update', async () => {
            const createResponse = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues", "givenName": "Bruno", "familyName": "Rodrigues" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues", "displayName": "Bruno Rodrigues", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(createResponse.status).toBe(200);
            const getResponse = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.displayName).toBe('Bruno Rodrigues');

            const patchResponse = await request(app)
                .patch('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "displayName", "value": "Bruno Rodrigues Updated" }] });
            expect(patchResponse.status).toBe(200);

            const getResultResponse = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResultResponse.status).toBe(200);
            expect(getResultResponse.body.displayName).toBe('Bruno Rodrigues Updated');
        })

        it('create lead whole group', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "bruno-rodrigues",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "bruno.rodrigues2@picpay.com",
                    },
                },
            })
            const leadResponse = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues", "givenName": "Bruno", "familyName": "Rodrigues" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues", "displayName": "Bruno Rodrigues", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(leadResponse.status).toBe(200);
            const lead = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(lead.status).toBe(200);
            expect(lead.body.displayName).toBe('Bruno Rodrigues');

            const employee = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues2", "givenName": "Bruno", "familyName": "Rodrigues2" }, "title": "Staff", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues2@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues2@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues2", "displayName": "Bruno Rodrigues2", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "bruno.rodrigues@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(employee.status).toBe(200);
            const getResponse = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues2@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.displayName).toBe('Bruno Rodrigues2');

            const additionalInformation = await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/bruno-rodrigues",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    members: ["user:picpay/bruno-rodrigues2"]
                });
            expect(additionalInformation.status).toBe(204);
        })

        it('failed to create same group', async () => {
            // user 1
            catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "bruno-rodrigues",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "bruno.rodrigues2@picpay.com",
                    },
                },
            })

            let leadResponse = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues", "givenName": "Bruno", "familyName": "Rodrigues" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues", "displayName": "Bruno Rodrigues", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(leadResponse.status).toBe(200);
            let lead = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(lead.status).toBe(200);
            expect(lead.body.displayName).toBe('Bruno Rodrigues');

            let employee = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues2", "givenName": "Bruno", "familyName": "Rodrigues2" }, "title": "Staff", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues2@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues2@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues2", "displayName": "Bruno Rodrigues2", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "bruno.rodrigues@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(employee.status).toBe(200);
            let getResponse = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues2@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.displayName).toBe('Bruno Rodrigues2');


            // user 2
            catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "reginaldo-castardo",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "reginaldo.castardo@picpay.com",
                    },
                },
            })

            employee = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    "meta": {
                        "resourceType": "User"
                    },
                    "name": {
                        "formatted": "Joao Almeida",
                        "givenName": "Joao",
                        "familyName": "Almeida"
                    },
                    "title": "Staff",
                    "active": true,
                    "emails": [
                        {
                            "type": "work",
                            "value": "joao.almeida@picpay.com",
                            "primary": true
                        }
                    ],
                    "schemas": [
                        "urn:ietf:params:scim:schemas:core:2.0:User",
                        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
                    ],
                    "userName": "joao.almeida@picpay.com",
                    "addresses": [
                        {
                            "type": "work",
                            "region": null,
                            "country": null,
                            "primary": false,
                            "locality": null,
                            "formatted": null,
                            "postalCode": "20230620",
                            "streetAddress": null
                        }
                    ],
                    "externalId": "joao.almeida",
                    "displayName": "Joao Almeida",
                    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
                        "manager": "joao.almeida@picpay.com",
                        "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH",
                        "employeeNumber": "154241"
                    }
                });
            expect(employee.status).toBe(200);
            getResponse = await request(app)
                .get('/scim/v2/Users/joao.almeida@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.displayName).toBe('Joao Almeida');

            leadResponse = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    "meta": {
                        "resourceType": "User"
                    },
                    "name": {
                        "formatted": "Reginaldo Castardo",
                        "givenName": "Reginaldo",
                        "familyName": "Castardo"
                    },
                    "title": "Staff",
                    "active": true,
                    "emails": [
                        {
                            "type": "work",
                            "value": "reginaldo.castardo@picpay.com",
                            "primary": true
                        }
                    ],
                    "schemas": [
                        "urn:ietf:params:scim:schemas:core:2.0:User",
                        "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"
                    ],
                    "userName": "reginaldo.castardo@picpay.com",
                    "addresses": [
                        {
                            "type": "work",
                            "region": null,
                            "country": null,
                            "primary": false,
                            "locality": null,
                            "formatted": null,
                            "postalCode": "20230620",
                            "streetAddress": null
                        }
                    ],
                    "externalId": "reginaldo.castardo",
                    "displayName": "Reginaldo Castardo",
                    "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": {
                        "manager": "reginaldo.castardo@picpay.com",
                        "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH",
                        "employeeNumber": "154241"
                    }
                });
            expect(leadResponse.status).toBe(200);
            lead = await request(app)
                .get('/scim/v2/Users/reginaldo.castardo@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(lead.status).toBe(200);
            expect(lead.body.displayName).toBe('Reginaldo Castardo');

            let additionalInformation = await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/bruno-rodrigues",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    members: ["user:picpay/bruno-rodrigues2"]
                });
            expect(additionalInformation.status).toBe(204);

            additionalInformation = await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/reginaldo-castardo",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    members: ["user:picpay/joao.almeida"]
                });
            expect(additionalInformation.status).toBe(409);
        })

        it('update lead group without orphanizing it', async () => {
            catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "bruno-rodrigues",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "bruno.rodrigues2@picpay.com",
                    },
                },
            })
            const leadResponse = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'bruno.rodrigues@picpay.com',
                    displayName: 'Bruno Rodrigues',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    active: true,
                });
            expect(leadResponse.status).toBe(200);
            const lead = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(lead.status).toBe(200);
            expect(lead.body.displayName).toBe('Bruno Rodrigues');

            const employee = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Bruno Rodrigues2", "givenName": "Bruno", "familyName": "Rodrigues2" }, "title": "Staff", "active": true, "emails": [{ "type": "work", "value": "bruno.rodrigues2@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "bruno.rodrigues2@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "bruno.rodrigues2", "displayName": "Bruno Rodrigues2", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "bruno.rodrigues@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } });
            expect(employee.status).toBe(200);
            const getResponse = await request(app)
                .get('/scim/v2/Users/bruno.rodrigues2@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();
            expect(getResponse.status).toBe(200);
            expect(getResponse.body.displayName).toBe('Bruno Rodrigues2');

            const additionalInformation = await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/bruno-rodrigues",
                    name: "squad-atlantis1",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                    members: ["user:picpay/bruno-rodrigues2"]
                });
            expect(additionalInformation.status).toBe(204);

            let retrieveAdditionalInformation = await request(app)
                .get(`/additional-information?entityRef=group:picpay/bruno-rodrigues`)
                .send();

            expect(retrieveAdditionalInformation.status).toBe(200);
            expect(retrieveAdditionalInformation.body.data[0].content.spec.profile.displayName).toBe('Atlantis');

            // change area
            const patchResponse = await request(app)
                .patch('/scim/v2/Users/bruno.rodrigues@picpay.com')
                .auth('test', { type: 'bearer' })
                .send({
                    Operations: [
                        {
                            op: 'replace',
                            path: 'department',
                            value: 'SFPF-WEB-TECHCORE-TECH-DEVEX'
                        }
                    ]
                });
            expect(patchResponse.status).toBe(200);

            retrieveAdditionalInformation = await request(app)
                .get(`/additional-information?entityRef=group:picpay/bruno-rodrigues`)
                .send();

            expect(retrieveAdditionalInformation.status).toBe(200);
            expect(retrieveAdditionalInformation.body.data[0].content.spec.profile.displayName).toBe('Atlantis');
            expect(retrieveAdditionalInformation.body.data[0].orphan).toBe(false);

            expect((await request(app)
                .delete(`/additional-information/${retrieveAdditionalInformation.body.data[0].id}`)
                .auth('test', { type: 'bearer' })
                .send()).status).toBe(204)
        })

        it('user added with wrong manager then fixed after', async () => {
            let informations: any[] = [];
            catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'diego.sana@picpay.com',
                    displayName: 'Diego Sana',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'cleber.mendes@picpay.com',
                    displayName: 'Cleber Mendes',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    manager: 'diego.sana@picpay.com',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.manager).toBe('diego.sana@picpay.com');


            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'cleber.mendes@picpay.com',
                    displayName: 'Cleber Mendes',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    manager: 'diego.sana@picpay.com',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.manager).toBe('diego.sana@picpay.com');

            // save employee without manager
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "employeeNumber": "157644" } })
                ).status).toBe(200);

            // check if manager is really empty
            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe(undefined);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/cleber-mendes",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/cleber-mendes`)
                .send()).body.data[0].orphan).toBe(false);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            // now add manager, but a wrong one
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "diego.sana@picpay.com" }] })
                ).status).toBe(200);

            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('diego.sana@picpay.com');

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // add department to employee
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH" }] })
                ).status).toBe(200);

            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].department).toBe('SFPF-WeB-RAT-TECHCORE-DEVEX-TECH');

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // fix the manager
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "cleber.mendes@picpay.com" }] })
                ).status).toBe(200);

            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('cleber.mendes@picpay.com');

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            for (const info of informations) {
                expect((await request(app)
                    .delete(`/additional-information/${info.id}`)
                    .auth('test', { type: 'bearer' })
                    .send()).status).toBe(204)
            }
        })

        it('user moved to another squad', async () => {
            let informations: any[] = [];
            // catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "cleber.mendes@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "rogerio-angeliski",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "rogerio.angeliski@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "ricardo-dedim",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "ricardo.dedim@picpay.com",
                    },
                },
            })
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'diego.sana@picpay.com',
                    displayName: 'Diego Sana',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'cleber.mendes@picpay.com',
                    displayName: 'Cleber Mendes',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    manager: 'diego.sana@picpay.com',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.manager).toBe('diego.sana@picpay.com');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    schemas: ['urn:ietf:params:scim:schemas:core:2.0:User'],
                    userName: 'cleber.mendes@picpay.com',
                    displayName: 'Cleber Mendes',
                    department: 'SFPF-WeB-RAT-TECHCORE-DEVEX-TECH',
                    manager: 'diego.sana@picpay.com',
                    active: true,
                })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.manager).toBe('diego.sana@picpay.com');

            // save employee without manager
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "employeeNumber": "157644" } })
                ).status).toBe(200);


            // save employee without problems
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Ricardo Dedim", "givenName": "Ricardo", "familyName": "Dedim" }, "title": "Dev", "active": true, "emails": [{ "type": "work", "value": "ricardo.dedim@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "ricardo.dedim@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "ricardo.dedim", "displayName": "Ricardo Dedim", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "employeeNumber": "157644" } })
                ).status).toBe(200);

            // check if manager is really empty
            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe(undefined);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            // now add manager
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "cleber.mendes@picpay.com" }] })
                ).status).toBe(200);

            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('cleber.mendes@picpay.com');

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/cleber-mendes",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    members: [
                        "user:picpay/rogerio-angeliski",
                        "user:picpay/ricardo-dedim"
                    ],
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/cleber-mendes`)
                .send()).body.data[0].orphan).toBe(false);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // add department to employee
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH" }] })
                ).status).toBe(200);

            expect((await request(app)
                .get('/scim/v2/Users/rogerio.angeliski@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].department).toBe('SFPF-WeB-RAT-TECHCORE-DEVEX-TECH');

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // check if angeliski is in the group
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBe(2);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.find((e: any) => e.entityRef === 'user:picpay/rogerio-angeliski')).not.toBe(undefined);

            // angeliski left the group 😓
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "diego.sana@picpay.com" }] })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .patch('/scim/v2/Users/rogerio.angeliski@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Add", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "SFPF-WeB-RAT-TECHCORE-FINOPS-TECH" }] })
                ).status).toBe(200);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBeGreaterThan(0);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.find((e: any) => e.entityRef === 'user:picpay/rogerio-angeliski')).toBe(undefined);
        })

        it('manager moved to another area', async () => {
            let informations: any[] = [];
            // catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "cleber.mendes@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "rogerio-angeliski",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "rogerio.angeliski@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "ricardo-dedim",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "ricardo.dedim@picpay.com",
                    },
                },
            })
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Diego Sana", "givenName": "Diego", "familyName": "Sana" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "diego.sana@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "diego.sana@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "diego.sana", "displayName": "Diego Sana", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Cleber Mendes", "givenName": "Cleber", "familyName": "Mendes" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "cleber.mendes@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "cleber.mendes@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "cleber.mendes", "displayName": "Cleber Mendes", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "diego.sana@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status)
                .toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('diego.sana@picpay.com');

            // save employees
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Ricardo Dedim", "givenName": "Ricardo", "familyName": "Dedim" }, "title": "Dev", "active": true, "emails": [{ "type": "work", "value": "ricardo.dedim@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "ricardo.dedim@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "ricardo.dedim", "displayName": "Ricardo Dedim", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            // create virtual groups
            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/cleber-mendes",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    members: [
                        "user:picpay/rogerio-angeliski",
                        "user:picpay/ricardo-dedim"
                    ],
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/cleber-mendes`)
                .send()).body.data[0].orphan).toBe(false);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // cleber-mendes left the group 😓
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/cleber.mendes@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "fernando.ike@picpay.com" }] })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .patch('/scim/v2/Users/cleber.mendes@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "SFPF-WeB-RAT-TECHCROSS-FOUNDENG-TECH" }] })
                ).status).toBe(200);

            // check if cleber-mendes group is now orphanized
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(true);

            // check if members are still available in the group 
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBe(2);
        })

        it('manager fired with a delete request', async () => {
            let informations: any[] = [];
            // catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "cleber.mendes@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "rogerio-angeliski",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "rogerio.angeliski@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "ricardo-dedim",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "ricardo.dedim@picpay.com",
                    },
                },
            })
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Diego Sana", "givenName": "Diego", "familyName": "Sana" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "diego.sana@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "diego.sana@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "diego.sana", "displayName": "Diego Sana", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Cleber Mendes", "givenName": "Cleber", "familyName": "Mendes" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "cleber.mendes@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "cleber.mendes@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "cleber.mendes", "displayName": "Cleber Mendes", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "diego.sana@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status)
                .toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('diego.sana@picpay.com');

            // save employees
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Ricardo Dedim", "givenName": "Ricardo", "familyName": "Dedim" }, "title": "Dev", "active": true, "emails": [{ "type": "work", "value": "ricardo.dedim@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "ricardo.dedim@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "ricardo.dedim", "displayName": "Ricardo Dedim", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            // create virtual groups
            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/cleber-mendes",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    members: [
                        "user:picpay/rogerio-angeliski",
                        "user:picpay/ricardo-dedim"
                    ],
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/cleber-mendes`)
                .send()).body.data[0].orphan).toBe(false);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // cleber-mendes left the organization 😓
            expect(
                (await request(app)
                    .delete('/scim/v2/Users/cleber.mendes@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send()
                ).status).toBe(204);

            // check if cleber-mendes group is now orphanized
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(true);

            // check if members are still available in the group 
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBe(2);
        })

        it('manager inactivated', async () => {
            let informations: any[] = [];
            // catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "cleber.mendes@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "rogerio-angeliski",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "rogerio.angeliski@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "ricardo-dedim",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "ricardo.dedim@picpay.com",
                    },
                },
            })
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Diego Sana", "givenName": "Diego", "familyName": "Sana" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "diego.sana@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "diego.sana@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "diego.sana", "displayName": "Diego Sana", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Cleber Mendes", "givenName": "Cleber", "familyName": "Mendes" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "cleber.mendes@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "cleber.mendes@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "cleber.mendes", "displayName": "Cleber Mendes", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "diego.sana@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status)
                .toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('diego.sana@picpay.com');

            // save employees
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Ricardo Dedim", "givenName": "Ricardo", "familyName": "Dedim" }, "title": "Dev", "active": true, "emails": [{ "type": "work", "value": "ricardo.dedim@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "ricardo.dedim@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "ricardo.dedim", "displayName": "Ricardo Dedim", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "cleber.mendes@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            // create virtual groups
            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/cleber-mendes",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    members: [
                        "user:picpay/rogerio-angeliski",
                        "user:picpay/ricardo-dedim"
                    ],
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/cleber-mendes`)
                .send()).body.data[0].orphan).toBe(false);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // cleber-mendes left the organization 😓
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/cleber.mendes@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "active", "value": "False" }, { "op": "Replace", "path": "userName", "value": "5a6fe1e575104775970d79d04474af6cleber.mendes@picpay.com" }] })
                ).status).toBe(200);

            // check if cleber-mendes group is now orphanized
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(true);

            // check if members are still available in the group 
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBe(2);
        })

        it('manager moved to another area then a new one takes the place', async () => {
            let informations: any[] = [];
            // catalogApi.getEntityByRef.mockResolvedValueOnce(undefined)
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "diego-sana",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "diego.sana@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "cleber-mendes",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "cleber.mendes@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "rogerio-angeliski",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "rogerio.angeliski@picpay.com",
                    },
                },
            })
            catalogApi.getEntityByRef.mockResolvedValueOnce({
                apiVersion: "backstage.io/v1alpha1",
                kind: "User",
                metadata: {
                    name: "ricardo-dedim",
                    namespace: "default",
                    description: "test",
                },
                spec: {
                    profile: {
                        email: "ricardo.dedim@picpay.com",
                    },
                },
            })

            // save leads
            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Diego Sana", "givenName": "Diego", "familyName": "Sana" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "diego.sana@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "diego.sana@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "diego.sana", "displayName": "Diego Sana", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status).toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/diego.sana@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body.displayName).toBe('Diego Sana');


            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Elton Carvalho", "givenName": "Elton", "familyName": "Carvalho" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "elton.carvalho@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "elton.carvalho@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "elton.carvalho", "displayName": "Elton Carvalho", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "diego.sana@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "154241" } })).status)
                .toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/elton.carvalho@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('diego.sana@picpay.com');

            expect((await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Cleber Mendes", "givenName": "Cleber", "familyName": "Mendes" }, "title": "Diretor Executivo", "active": true, "emails": [{ "type": "work", "value": "cleber.mendes@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "cleber.mendes@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "cleber.mendes", "displayName": "Cleber Mendes", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "oswaldo.dasilva@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-QAPF", "employeeNumber": "154241" } })).status)
                .toBe(200);
            expect((await request(app)
                .get('/scim/v2/Users/cleber.mendes@picpay.com')
                .auth('test', { type: 'bearer' })
                .send()).body[EXTENSION_ENTERPRISE].manager).toBe('oswaldo.dasilva@picpay.com');

            // save employees
            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Rogerio Angeliski", "givenName": "Rogerio", "familyName": "Angeliski" }, "title": "Especialista Engenharia de Software", "active": true, "emails": [{ "type": "work", "value": "rogerio.angeliski@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "rogerio.angeliski@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "rogerio.angeliski", "displayName": "Rogerio Angeliski", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "elton.carvalho@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .post('/scim/v2/Users')
                    .auth('test', { type: 'bearer' })
                    .send({ "meta": { "resourceType": "User" }, "name": { "formatted": "Ricardo Dedim", "givenName": "Ricardo", "familyName": "Dedim" }, "title": "Dev", "active": true, "emails": [{ "type": "work", "value": "ricardo.dedim@picpay.com", "primary": true }], "schemas": ["urn:ietf:params:scim:schemas:core:2.0:User", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User"], "userName": "ricardo.dedim@picpay.com", "addresses": [{ "type": "work", "region": null, "country": null, "primary": false, "locality": null, "formatted": null, "postalCode": "20230620", "streetAddress": null }], "externalId": "ricardo.dedim", "displayName": "Ricardo Dedim", "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User": { "manager": "elton.carvalho@picpay.com", "department": "SFPF-WeB-RAT-TECHCORE-DEVEX-TECH", "employeeNumber": "157644" } })
                ).status).toBe(200);

            // create virtual groups
            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/diego-sana",
                    name: "tribe-devex",
                    displayName: 'Devex',
                    description: 'test of description',
                    type: 'tribe',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/diego-sana`)
                .send()).body.data[0].orphan).toBe(false);

            expect((await request(app)
                .post('/additional-information')
                .send({
                    identifier: "picpay/elton-carvalho",
                    name: "squad-atlantis",
                    displayName: 'Atlantis',
                    description: 'test of description',
                    members: [
                        "user:picpay/rogerio-angeliski",
                        "user:picpay/ricardo-dedim"
                    ],
                    type: 'squad',
                })).status).toBe(204);

            expect((await request(app)
                .get(`/additional-information?entityRef=group:picpay/elton-carvalho`)
                .send()).body.data[0].orphan).toBe(false);

            // check if no group is orphan
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data;
            expect(informations.find(e => e.entityRef === 'group:picpay/elton-carvalho').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes')).toBe(undefined);
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);

            // elton-carvalho left the group 😓
            expect(
                (await request(app)
                    .patch('/scim/v2/Users/elton.carvalho@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:manager", "value": "fernando.ike@picpay.com" }] })
                ).status).toBe(200);

            expect(
                (await request(app)
                    .patch('/scim/v2/Users/elton.carvalho@picpay.com')
                    .auth('test', { type: 'bearer' })
                    .send({ "schemas": ["urn:ietf:params:scim:api:messages:2.0:PatchOp"], "Operations": [{ "op": "Replace", "path": "urn:ietf:params:scim:schemas:extension:enterprise:2.0:User:department", "value": "SFPF-WeB-RAT-TECHCROSS-FOUNDENG-TECH" }] })
                ).status).toBe(200);

            // check if elton-carvalho group is now orphanized
            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/elton-carvalho').orphan).toBe(true);

            // check if members are still available in the group 
            expect(informations.find(e => e.entityRef === 'group:picpay/elton-carvalho').members.length).toBe(2);

            // cleber-mendes takes elton-carvalho place 
            expect((await request(app)
                .post(`/additional-information/orphans/assume`)
                .send({
                    entityRef: "group:picpay/elton-carvalho",
                    newEntityRef: "group:picpay/cleber-mendes",
                })).status).toBe(200);

            informations = (await request(app)
                .get(`/additional-information`)
                .send()).body.data as any[];
            expect(informations.find(e => e.entityRef === 'group:picpay/diego-sana').orphan).toBe(false);
            expect(informations.find(e => e.entityRef === 'group:picpay/elton-carvalho')).toBe(undefined);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes')).not.toBe(undefined);
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').orphan).toBe(false);

            // check if members are still available in the group 
            expect(informations.find(e => e.entityRef === 'group:picpay/cleber-mendes').members.length).toBe(2);
        })
    });

    describe('GET /scim/v2', () => {
        it('should return SCIM service provider configuration', async () => {
            const response = await request(app)
                .get('/scim/v2')
                .auth('test', { type: 'bearer' })
                .send();

            expect(response.status).toBe(200);
            expect(response.body).toEqual({
                schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
                patch: { supported: true },
                bulk: { supported: true },
                filter: { supported: false },
                changePassword: { supported: false },
                sort: { supported: false },
                etag: { supported: false },
            });
        });

        it('should require authentication', async () => {
            const response = await request(app)
                .get('/scim/v2')
                .send();

            expect(response.status).toBe(401);
        });
    });

    describe('POST /scim/v2/Bulk', () => {
        it('should handle multiple user creations', async () => {
            const response = await request(app)
                .post('/scim/v2/Bulk')
                .auth('test', { type: 'bearer' })
                .send({
                    Operations: [
                        {
                            method: 'POST',
                            path: '/Users',
                            body: {
                                userName: 'user1@picpay.com',
                                displayName: 'User One',
                                active: true
                            }
                        },
                        {
                            method: 'POST',
                            path: '/Users',
                            body: {
                                userName: 'user2@picpay.com',
                                displayName: 'User Two',
                                active: true
                            }
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:BulkResponse');
        });

        it('should handle mixed operations', async () => {
            // First create a user
            const createUser = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    userName: 'test.user@picpay.com',
                    displayName: 'Test User',
                    active: true
                });
            expect(createUser.status).toBe(200);

            // Then perform bulk operations
            const response = await request(app)
                .post('/scim/v2/Bulk')
                .auth('test', { type: 'bearer' })
                .send({
                    Operations: [
                        {
                            method: 'PATCH',
                            path: '/Users/test.user@picpay.com',
                            body: {
                                Operations: [
                                    { op: 'Replace', path: 'displayName', value: 'Updated Test User' }
                                ]
                            }
                        },
                        {
                            method: 'POST',
                            path: '/Users',
                            body: {
                                userName: 'new.user@picpay.com',
                                displayName: 'New User',
                                active: true
                            }
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.schemas).toContain('urn:ietf:params:scim:api:messages:2.0:BulkResponse');
        });

        it('should handle invalid operations gracefully', async () => {
            const response = await request(app)
                .post('/scim/v2/Bulk')
                .auth('test', { type: 'bearer' })
                .send({
                    Operations: [
                        {
                            method: 'INVALID',
                            path: '/Users',
                            body: {
                                userName: 'user@picpay.com'
                            }
                        }
                    ]
                });

            expect(response.status).toBe(200);
            expect(response.body.Operations[0].status).toBe('400');
            expect(response.body.Operations[0].response.detail).toContain('Unsupported method');
        });

        it('should reject request without Operations array', async () => {
            const response = await request(app)
                .post('/scim/v2/Bulk')
                .auth('test', { type: 'bearer' })
                .send({});

            expect(response.status).toBe(400);
            expect(response.body.detail).toBe('Invalid or missing Operations');
        });

        it('should handle user deletion in bulk', async () => {
            // First create a user
            const createUser = await request(app)
                .post('/scim/v2/Users')
                .auth('test', { type: 'bearer' })
                .send({
                    userName: 'delete.user@picpay.com',
                    displayName: 'Delete User',
                    active: true
                });
            expect(createUser.status).toBe(200);

            // Then delete via bulk operation
            const response = await request(app)
                .post('/scim/v2/Bulk')
                .auth('test', { type: 'bearer' })
                .send({
                    Operations: [
                        {
                            method: 'DELETE',
                            path: '/Users/delete.user@picpay.com'
                        }
                    ]
                });

            expect(response.status).toBe(200);

            // Verify user is deleted
            const getUser = await request(app)
                .get('/scim/v2/Users/delete.user@picpay.com')
                .auth('test', { type: 'bearer' })
                .send();

            expect(getUser.body.active).toBe(false);
        });
    });
});