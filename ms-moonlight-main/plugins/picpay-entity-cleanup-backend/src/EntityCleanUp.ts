import { Entity } from '@backstage/catalog-model';
import { Config } from '@backstage/config';
import fetch from 'cross-fetch';
import { Logger } from 'winston';
import { PluginTaskScheduler } from '@backstage/backend-tasks';
import { metrics } from '@opentelemetry/api';

type Options = {
  logger: Logger;
  config: Config;
  scheduler: PluginTaskScheduler;
};

type LocationItems = {
  status?: {
    items: [
      {
        type: string;
        level: string;
        message: string;
        error: {
          name: string;
          message: string;
        };
      },
    ];
  };
};

type Location = Entity & LocationItems;

export const removeProblematicLocationsScheduler = async ({
  scheduler,
  config,
  logger,
}: Options): Promise<void> => {
  const baseUrl = config.getString('backend.baseUrl');
  const taskRunner = scheduler.createScheduledTaskRunner({
    frequency: {
      minutes: 30,
    },
    timeout: { minutes: 5 },
    initialDelay: { minutes: 1 }, // wait for the  backstage api to start
  });

  taskRunner.run({
    id: 'removeProblematicLocations',
    fn: async () => {
      const gauge = metrics.getMeter('default')
        .createObservableGauge('catalog.entities.problematic_locations', {
          description: 'Number of Problematic Locations removed from the Catalog',
        })

      const locationsReq = await fetch(
        `${baseUrl}/api/catalog/entities?filter=kind=Location`,
      );
      if (!locationsReq.ok)
        throw new Error(
          `couldn't fetch problematic locations: ${await locationsReq.text()}`,
        );

      const locations: Location[] = await locationsReq.json();
      const problematicLocations = locations.filter(l =>
        l.status?.items.find(status => status.message.includes('NotFoundError'))
      );
      await Promise.all(
        problematicLocations.map(async location => {
          if (!location.metadata.uid) {
            logger.warn(`no uid for orphan: ${location.metadata.name}`);
            return;
          }

          const deletionReq = await fetch(
            `${baseUrl}/api/catalog/entities/by-uid/${location.metadata.uid}`,
            {
              method: 'DELETE',
            },
          );
          if (!deletionReq.ok)
            logger.warn(
              `failed to delete problematic location: ${location.metadata.name
              }, ${await deletionReq.text()}`,
            );

          logger.info(`Successfully removed problematic location ${location}`);

          return;
        }),
      );
      const managedByCounts: Record<string, number> = {};

      problematicLocations.forEach(location => {
        const managedBy = location.metadata.annotations?.['backstage.io/managed-by-location'] || 'unknown';
        managedByCounts[managedBy] = (managedByCounts[managedBy] || 0) + 1;
      });

      gauge.addCallback(observableGauge => {
        for (const [managedBy, count] of Object.entries(managedByCounts)) {
          observableGauge.observe(count, { managedByLocation: managedBy });
        }
      });
    },
  });
};

export const removeOrphansScheduler = async ({
  scheduler,
  config,
  logger,
}: Options): Promise<void> => {
  const baseUrl = config.getString('backend.baseUrl');
  const taskRunner = scheduler.createScheduledTaskRunner({
    frequency: {
      minutes: 30,
    },
    timeout: { minutes: 5 },
    initialDelay: { minutes: 1 }, // wait for the  backstage api to start
  });

  taskRunner.run({
    id: 'removeOrphans',
    fn: async () => {
      const gauge = metrics.getMeter('default')
        .createObservableGauge('catalog.entities.orphan_cleanup', {
          description: 'Number of Orphan Entities removed from the Catalog',
        })

      const orphanReq = await fetch(
        `${baseUrl}/api/catalog/entities?filter=metadata.annotations.backstage.io/orphan=true`,
      );
      if (!orphanReq.ok)
        throw new Error(`couldn't fetch orphans: ${await orphanReq.text()}`);

      const orphans: Entity[] = await orphanReq.json();
      await Promise.all(
        orphans.map(async orphan => {
          if (!orphan.metadata.uid) {
            logger.warn(`no uid for orphan: ${orphan.metadata.name}`);
            return;
          }

          const deletionReq = await fetch(
            `${baseUrl}/api/catalog/entities/by-uid/${orphan.metadata.uid}`,
            {
              method: 'DELETE',
            },
          );
          if (!deletionReq.ok)
            logger.warn(
              `failed to delete orphan: ${orphan.metadata.name
              }, ${await deletionReq.text()}`,
            );

          logger.info(`Successfully removed orphan ${orphan}`);

          return;
        }),
      );

      const managedByCounts: Record<string, number> = {};

      orphans.forEach(location => {
        const managedBy = location.metadata.annotations?.['backstage.io/managed-by-location'] || 'unknown';
        managedByCounts[managedBy] = (managedByCounts[managedBy] || 0) + 1;
      });

      gauge.addCallback(observableGauge => {
        for (const [managedBy, count] of Object.entries(managedByCounts)) {
          observableGauge.observe(count, { managedByLocation: managedBy });
        }
      });
    },
  });
};
