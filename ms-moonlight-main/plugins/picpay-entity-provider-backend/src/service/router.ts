import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Database } from '../database/Database';
import { BulkOperation, BulkOperationResult, EXTENSION_ENTERPRISE, applyOperations, authorizeScim, createUser, deleteUser, patchUser } from './scim';
import { CatalogApi } from '@backstage/catalog-client';
import _ from 'lodash';
import { additionalInformationHandler, additionalInformationGetById, additionalInformationDelete, additionalInformationQuery, additionalInformationOrphans, additionalInformationPatchHandler, additionalInformationAssumeOrphan, additionalInformationDeleteFromEntityRef, additionalInformationMembers, additionalInformationMembersWebhookHandler } from './AdditionalInformation';
import { LoggerService, SchedulerService } from '@backstage/backend-plugin-api';

export interface RouterOptions {
  logger: LoggerService;
  config: Config;
  catalogApi: CatalogApi;
  database: Database;
  scheduler?: SchedulerService
}

export async function createRouter({
  config,
  logger,
  catalogApi,
  database,
  scheduler,
}: RouterOptions): Promise<express.Router> {
  const router = Router();

  router.use(
    express.json({
      type: ['application/json', 'application/scim+json'],
    })
  );

  // Additional Information
  router.get('/additional-information', async (req, res) => {
    await additionalInformationQuery({
      catalogApi,
      database,
      req,
      res,
    });
  });

  router.get('/additional-information/:id/members', async (req, res) => {
    await additionalInformationMembers({
      database,
      req,
      res,
    });
  });

  router.get('/additional-information/orphans', async (_req, res) => {
    await additionalInformationOrphans({
      database,
      res,
    });
  });

  router.post('/additional-information/orphans/assume', async (req, res) => {
    await additionalInformationAssumeOrphan({
      database,
      req,
      res,
    });
  });

  router.get('/additional-information/:id', async (req, res) => {
    await additionalInformationGetById({
      database,
      req,
      res,
    });
  });

  router.delete('/additional-information/:id', async (req, res) => {
    await additionalInformationDelete({
      database,
      req,
      res,
    });
  });

  router.delete('/additional-information/by-entity-ref/:entityRef', async (req, res) => {
    await additionalInformationDeleteFromEntityRef({
      database,
      req,
      res,
    });
  });

  // GET /additional-information
  router.post('/additional-information', async (req, res) => {
    await additionalInformationHandler({
      catalogApi,
      database,
      req,
      res,
    });
  });

  // GET /additional-information
  router.patch('/additional-information/:id', async (req, res) => {
    await additionalInformationPatchHandler({
      catalogApi,
      database,
      req,
      res,
    });
  });

  // GET /additional-information
  router.post('/additional-information/webhooks/members', async (req, res) => {
    await additionalInformationMembersWebhookHandler({
      baseUrl: config.getString('backend.baseUrl'),
      notModifiedTemplate: config.getString('picpayEntityProvider.callbacks.template.notModifiedTemplate'),
      modifiedTemplate: config.getString('picpayEntityProvider.callbacks.template.modified'),
      replacedTemplate: config.getString('picpayEntityProvider.callbacks.template.replaced'),
      database,
      req,
      res,
    });
  });

  // /SCIM
  router.use(
    '/scim',
    authorizeScim(
      config.getString('picpayEntityProvider.microsoftAD.scimToken')
    )
  );

  // GET /scim/v2
  router.get('/scim/v2', async (_req, res) => {
    res.send({
      schemas: ['urn:ietf:params:scim:schemas:core:2.0:ServiceProviderConfig'],
      patch: { supported: true },
      bulk: { supported: true },
      filter: { supported: false },
      changePassword: { supported: false },
      sort: { supported: false },
      etag: { supported: false },
    });
  });

  // GET /scim/v2/Users
  router.get('/scim/v2/Users', async (_req, res) => {
    res.send({
      schemas: ['urn:ietf:params:scim:api:messages:2.0:ListResponse'],
      totalResults: 0,
      startIndex: 1,
      itemsPerPage: 0,
      Resources: [],
    });
  });

  // GET /scim/v2/Users/:id
  router.get('/scim/v2/Users/:id', async (req, res) => {
    const result = await database.microsoftAD().get(req.params.id);

    if (!result?.content) {
      logger.info(`User not found: ${req.params.id}`);

      return res.status(404).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'User not found',
        status: 404,
      });
    }

    const content = result.content;

    if (content[EXTENSION_ENTERPRISE]) {
      content[EXTENSION_ENTERPRISE] = {
        department: content[EXTENSION_ENTERPRISE]?.department,
        employeeNumber: content[EXTENSION_ENTERPRISE]?.employeeNumber,
        manager: content[EXTENSION_ENTERPRISE]?.manager,
      };
    }

    return res.send(result?.content);
  });

  // POST /scim/v2/Users
  router.post('/scim/v2/Users', async (req, res) => {
    await createUser(req, res, logger, database);
  });

  // PATCH /scim/v2/Users/:id
  router.patch('/scim/v2/Users/:id', async (req, res) => {
    await patchUser(req, res, logger, database);
  });

  // DELETE /scim/v2/Users/:id
  router.delete('/scim/v2/Users/:id', async (req, res) => {
    await deleteUser(req, res, logger, database);
  });

  router.post('/scim/v2/Bulk', async (req: express.Request, res: express.Response) => {
    try {
      const { Operations }: { Operations?: BulkOperation[] } = req.body;
      if (!Operations || !Array.isArray(Operations)) {
        return res.status(400).send({
          schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
          detail: 'Invalid or missing Operations',
          status: 400,
        });
      }

      const results: BulkOperationResult[] = [];
      let statusCode = 200;

      for (const operation of Operations) {
        const method = operation.method?.toUpperCase();
        const path = operation.path || '';
        let operationResult: BulkOperationResult;

        try {
          switch (method) {
            case 'POST': {
              const content = {
                id: operation.body.userName,
                ...operation.body,
              };
              await database.microsoftAD().create({ id: content.id, content });
              operationResult = {
                status: '201',
                location: `/Users/${content.id}`,
                response: content
              };
              break;
            }
            case 'PATCH': {
              const userId = path.split('/').pop() ?? '';
              const previousContent = await database.microsoftAD().get(userId);
              if (!previousContent?.content) {
                operationResult = {
                  status: '404',
                  response: {
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'User not found'
                  }
                };
              } else {
                const newContent = applyOperations(previousContent.content, operation.body?.Operations);
                await database.microsoftAD().update(userId, newContent);
                operationResult = {
                  status: '200',
                  response: newContent
                };
              }
              break;
            }
            case 'DELETE': {
              const userId = path.split('/').pop() ?? '';
              const result = await database.microsoftAD().get(userId);
              if (!result?.content) {
                operationResult = {
                  status: '404',
                  response: {
                    schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                    detail: 'User not found'
                  }
                };
              } else {
                result.content.active = false;
                await database.microsoftAD().update(userId, result.content);
                operationResult = { status: '204' };
              }
              break;
            }
            default:
              operationResult = {
                status: '400',
                response: {
                  schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
                  detail: `Unsupported method: ${method}`,
                },
              };
          }
        } catch (e) {
          operationResult = {
            status: '400',
            response: {
              schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
              detail: e instanceof Error ? e.message : 'Operation failed'
            }
          };
          statusCode = 400;
        }

        results.push(operationResult);
      }

      res.status(statusCode).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:BulkResponse'],
        Operations: results
      });
    } catch (e) {
      logger.error('Bulk operation error', e);
      res.status(400).send({
        schemas: ['urn:ietf:params:scim:api:messages:2.0:Error'],
        detail: 'Error processing bulk request',
        status: 400,
      });
    }
    return Promise.resolve();
  });

  router.use(errorHandler());

  await scheduler?.scheduleTask({
    id: `entity-provider:clean-up-events`,
    frequency: { seconds: Number(process.env.EVENTS_CLEANUP_FREQUENCY ?? 60 * 10) },
    timeout: { seconds: 100 },
    initialDelay: { seconds: 100 },
    scope: 'local',
    fn: async () => {
      try {
        await database.events().cleanupOldEvents();
      } catch (error) {
        logger.error('Failed to consume AWS SQS messages', error);
      }
    },
  });

  return router;
}
