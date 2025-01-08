import { CatalogBuilder } from '@backstage/plugin-catalog-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
import { UnprocessedEntitiesModule } from '@backstage/plugin-catalog-backend-module-unprocessed';
import { EntityProcessorIntermediator, PicPayEntityProcessor } from '@internal/plugin-picpay-custom-entity-processor-backend';

export default async function createPlugin(
  env: PluginEnvironment,
  intermediators: EntityProcessorIntermediator[] = [],
): Promise<Router> {
  const builder = CatalogBuilder.create(env);
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  builder.addProcessor(new PicPayEntityProcessor(env.logger, intermediators));

  const { processingEngine, router } = await builder.build();

  const unprocessed = UnprocessedEntitiesModule.create({
    database: await env.database.getClient(),
    router,
    permissions: env.permissions,
    discovery: env.discovery,
  });
  unprocessed.registerRoutes();

  await processingEngine.start();
  return router;
}
