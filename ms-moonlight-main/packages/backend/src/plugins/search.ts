import { useHotCleanup } from '@backstage/backend-common';
import { createRouter } from '@backstage/plugin-search-backend';
import {
  IndexBuilder,
  LunrSearchEngine,
} from '@backstage/plugin-search-backend-node';
import { PluginEnvironment } from '../types';
import { DefaultCatalogCollatorFactory } from '@backstage/plugin-search-backend-module-catalog';
import { DefaultTechDocsCollatorFactory } from '@backstage/plugin-search-backend-module-techdocs';
import { AnnouncementCollatorFactory } from '@internal/plugin-picpay-announcements-backend';
import { ElasticSearchSearchEngine } from '@backstage/plugin-search-backend-module-elasticsearch';
import { PgSearchEngine } from '@backstage/plugin-search-backend-module-pg';

async function createSearchEngine({
  config,
  logger,
  database,
}: Pick<PluginEnvironment, 'config' | 'logger' | 'database'>) {
  try {
    if (config.getOptionalString('search.elasticsearch.node')) {
      return await ElasticSearchSearchEngine.fromConfig({
        logger,
        config,
        indexPrefix: 'moonlight_search-',
      });
    }
  } catch (err) {
    logger.error('Failed to initialize Elasticsearch search engine', err);
  }

  if (await PgSearchEngine.supported(database)) {
    return await PgSearchEngine.fromConfig(config, {
      database,
      logger,
    });
  }

  return new LunrSearchEngine({ logger });
}

export default async function createPlugin({
  logger,
  discovery,
  tokenManager,
  config,
  permissions,
  scheduler,
  database,
}: PluginEnvironment) {
  logger.info('Initializing search backend plugin');

  const indexBuilder = new IndexBuilder({
    logger,
    searchEngine: await createSearchEngine({ config, logger, database }),
  });

  const every30MinutesScheduleCatalog = scheduler.createScheduledTaskRunner({
    frequency: { minutes: 30 },
    timeout: { minutes: 45 },
    initialDelay: { seconds: 30 },
  });

  const every30MinutesScheduleTechDocs = scheduler.createScheduledTaskRunner({
    frequency: { minutes: 30 },
    timeout: { minutes: 45 },
    initialDelay: { seconds: 60 },
  });

  // Collators are responsible for gathering documents known to plugins. This
  // particular collator gathers entities from the software catalog.
  indexBuilder.addCollator({
    schedule: every30MinutesScheduleCatalog,
    factory: DefaultCatalogCollatorFactory.fromConfig(config, {
      discovery,
      tokenManager,
    }),
  });

  indexBuilder.addCollator({
    schedule: every30MinutesScheduleTechDocs,
    factory: DefaultTechDocsCollatorFactory.fromConfig(config, {
      discovery,
      tokenManager,
      logger,
    }),
  });

  // Announcements indexing
  indexBuilder.addCollator({
    schedule: every30MinutesScheduleCatalog,
    factory: AnnouncementCollatorFactory.fromConfig({
      logger,
      discoveryApi: discovery,
    }),
  });

  // The scheduler controls when documents are gathered from collators and sent
  // to the search engine for indexing.
  const { scheduler: schedulerSearch } = await indexBuilder.build();

  // A 3 second delay gives the backend server a chance to initialize before
  // any collators are executed, which may attempt requests against the API.
  setTimeout(() => schedulerSearch.start(), 3000);
  useHotCleanup(module, () => schedulerSearch.stop());

  return createRouter({
    engine: indexBuilder.getSearchEngine(),
    logger,
    types: indexBuilder.getDocumentTypes(),
    permissions,
    config,
  });
}
