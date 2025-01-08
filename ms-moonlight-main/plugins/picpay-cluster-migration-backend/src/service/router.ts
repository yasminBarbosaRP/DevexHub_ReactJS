import { errorHandler } from '@backstage/backend-common';
import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import fetch from 'cross-fetch';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  getPodCountByPhase: (namespace: string, stage: string) => Promise<number>;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const router = Router();
  router.use(express.json());
  const baseUrl = options.config.getString('backend.baseUrl');

  router.post('/status-switcher/run', async (_, response) => {
    try {
      const entitiesReq = await fetch(
        `${baseUrl}/api/catalog/entities?filter=metadata.annotations.moonlight.picpay/cluster-migration-status=MIGRATING&fields=metadata.name,kind,metadata.annotations.backstage.io/kubernetes-id`,
      );
      if (!entitiesReq.ok)
        throw new Error(
          `couldn't fetch entities that are migrating: ${await entitiesReq.text()}`,
        );

      const entities: Entity[] = await entitiesReq.json();
      const responses: string[] = [];
      await Promise.all(
        entities.map(async entity => {
          const annotations = entity.metadata.annotations ?? {};
          const namespacedPods = await options.getPodCountByPhase(
            annotations['backstage.io/kubernetes-id'] || entity.metadata.name,
            'msprod',
          );
          options.logger.debug(`processing entity: ${entity.metadata.name}`);
          options.logger.debug(`pods on namespace: ${namespacedPods}`);
          if (namespacedPods === 0) {
            options.logger.info(
              `No pods found for entity ${entity.metadata.name}, migration is complete`,
            );
            const annotationRequest = await fetch(
              `${baseUrl}/api/annotation-intermediators/`,
              {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  filter: {
                    'metadata.name': entity.metadata.name,
                    kind: entity.kind,
                  },
                  annotation: {
                    'moonlight.picpay/cluster-migration-status': 'MIGRATED',
                    'moonlight.picpay/cluster-migration-finished-at': new Date()
                      .getTime()
                      .toString(),
                  },
                }),
              },
            );
            if (!annotationRequest.ok) {
              responses.push(
                `failed to switch migration status: ${entity.metadata.name
                }, ${await annotationRequest.text()} status: ${annotationRequest.status
                }`,
              );
            } else {
              responses.push(
                `Successfully updated cluster migration status of entity ${entity.metadata.name
                } ${await annotationRequest.text()}`,
              );
            }
          } else {
            responses.push(
              `Entity ${entity.metadata.name} has ${namespacedPods} pods yet, migration is in progress`,
            );
          }
        }),
      );

      response.json({ data: responses });
    } catch (err: any) {
      const errStr = JSON.stringify(err, Object.getOwnPropertyNames(err));
      response.status(500).json({ message: 'Error occurred', error: errStr });
    }
  });
  router.use(errorHandler());
  return router;
}
