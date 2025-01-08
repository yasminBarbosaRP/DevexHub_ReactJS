import { createRouter, Database } from '@internal/plugin-picpay-repository-rules-backend';
import { CatalogClient } from '@backstage/catalog-client';
import { PluginEnvironment } from '../types';

export default async function createPlugin({ config, logger, database, discovery }: PluginEnvironment) {
  const daysEnv = process.env.DAYS_TO_VALIDATE_PARENTS_REPO;
  
  if (!daysEnv) {
    throw new Error('ENV DAYS_TO_VALIDATE_PARENTS_REPO is required');
  }
  const days = parseInt(daysEnv, 10);

  const catalog = new CatalogClient({ discoveryApi: discovery });

  return createRouter({
    config,
    logger,
    catalog,
    database: await Database.create({ database }),
    daysEnv: days,
  });
}
