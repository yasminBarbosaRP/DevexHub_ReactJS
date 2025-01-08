import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { Entity } from '@backstage/catalog-model';
import { Database } from '../database/Database';
import { PluginCacheManager, PluginDatabaseManager } from '@backstage/backend-common';
import { EntityRef, PicPayGroup } from './Record';
import { ANNOTATIONS_BASE, PicPayProvider } from './PicPayProvider';
import { CacheService, SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import * as uuid from 'uuid';
import { Members } from '../database/tables';
import { Attributes, metrics, ObservableGauge, trace } from '@opentelemetry/api';
import { withActiveSpan, TRACER_ID } from '../utils/opentelemetry';
import { Config } from '@backstage/config';

const tracer = trace.getTracer(TRACER_ID);

export class PicPayGroupProvider
  extends PicPayProvider
  implements EntityProvider {
  private connection?: EntityProviderConnection;
  private scheduleFn?: () => Promise<void>;
  protected config: Config;
  private gauge: ObservableGauge<Attributes>;

  public static async create(
    logger: Logger,
    config: Config,
    databaseManager: PluginDatabaseManager,
    catalogDatabaseManager: PluginDatabaseManager,
    cache: PluginCacheManager,
    schedule: 'manual' | SchedulerServiceTaskRunner
  ) {
    const db = await Database.create(databaseManager, catalogDatabaseManager);
    return new PicPayGroupProvider(logger.child({ plugin: 'picpay-group-provider' }), config, db, cache, schedule);
  }

  constructor(logger: Logger, config: Config, database: Database, cache: PluginCacheManager, scheduleFn?: 'manual' | SchedulerServiceTaskRunner) {
    super(logger, database, cache);
    this.schedule(scheduleFn);
    this.config = config;
    this.gauge = metrics.getMeter('default')
      .createObservableGauge('catalog.provider.picpay.groups.changes', {
        description: 'Changes from Groups of PicPayProvider',
      })
  }

  public getProviderName(): string {
    return `picpay-group-provider`;
  }

  private schedule(schedule?: 'manual' | SchedulerServiceTaskRunner) {
    if (!schedule || schedule === 'manual') {
      return;
    }

    this.scheduleFn = async () => {
      const id = `${this.getProviderName()}:refresh`;
      await schedule.run({
        id,
        fn: async () => {
          const logger = this.logger.child({
            class: PicPayProvider.prototype.constructor.name,
            taskId: id,
            taskInstanceId: uuid.v4(),
          });

          try {
            await this.run();
          } catch (error) {
            logger.error(
              `${this.getProviderName()} refresh failed, ${error}`,
              error,
            );
          }
        },
      });
    };
  }

  public async connect(connection: EntityProviderConnection): Promise<void> {
    this.connection = connection;
    this.logger.info(`Connecting to ${this.getProviderName()}`);
    await this.scheduleFn?.();
  }

  public async run(): Promise<void> {
    await withActiveSpan(tracer, 'PicPayGroupProvider', async span => {
      this.logger.info(`picpay-group-provider started`);
      if (!this.connection) {
        this.logger.error('No connection provided');
        return;
      }

      await this.clearCache();
      await this.preloadAdditionalInformation(); // Preload additional info

      const groupEntities: Entity[] = [];
      const db = this.database.microsoftAD();
      let page = 1;
      let groups: PicPayGroup[] = [];

      this.gauge.addCallback(observableGauge => {
        observableGauge.observe(groupEntities.length, { type: 'total' });
        observableGauge.observe(
          groupEntities.filter(g => (g.spec?.profile as any)?.displayName?.endsWith('team')).length,
          { type: 'renamed' }
        );
        observableGauge.observe(
          groupEntities.filter(g => !(g.spec?.profile as any)?.displayName?.endsWith('team')).length,
          { type: 'original' }
        );
      });

      do {
        this.logger.debug(`fetching groups page ${page}`);

        groups = await db.listGroups({ perPage: 200, page });
        if (!groups.length) {
          this.logger.info(`groups pagination ended`);
          break;
        }

        this.logger.info(`processing ${groups.length} groups`);

        groupEntities.push(...(await Promise.all(groups.map(async (group: PicPayGroup): Promise<Entity[]> => {
          const groupRef = EntityRef.fromEmail(group.email, 'group');
          const leadRef = EntityRef.fromEmail(group.email, 'user').toString()

          if (!groupRef.isValid()) {
            this.logger.error(`group ${group.email} is invalid due groupRef: ${groupRef.toString()}`);
            return [];
          }

          if (!group.parent_email) {
            this.logger.debug(`group ${group.email} has no parent`);
          }

          const parentRefs = await this.realEntityRef(EntityRef.fromEmail(group.parent_email, 'group'),
            (members: Members[]) => members.length === 0 || members.some(e => {
              return e.entityRef.includes(leadRef)
            }));

          const result = await this.additionalInformation(groupRef, {
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Group',
            metadata: {
              namespace: groupRef.namespace!,
              name: groupRef.name!,
              description: group.department || '',
              annotations: ANNOTATIONS_BASE,
            },
            spec: {
              type: 'team',
              parent: parentRefs && groupRef.equals(parentRefs[0]) ? undefined : parentRefs?.[0].toString(),
              leadRef: EntityRef.fromEmail(group.email).toString(),
              leadEmail: group.email,
              department: group.department ?? '',
              memberOf: [],
              children: [],
              profile: {
                displayName: `${group.name} team`,
              },
            },
          });
          return result
        }))).flat());

        page++;
      } while (groups.length);

      span.setAttribute('groups', groupEntities.length);

      this.logger.info(`picpay-group-provider finished with ${groupEntities.length} entities`);
      await this.connection.applyMutation({
        type: 'full',
        entities: groupEntities.map(entity => ({
          entity,
          locationKey: this.getProviderName(),
        })),
      });

      await this.database.refreshStateRepository().forceRefreshByLocationKey(
        this.getProviderName(),
        new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      );

      if (!this.config.getOptionalBoolean('picpayEntityProvider.remainders.unnamedGroups.enabled')) {
        return;
      }

      const leadsToBeNotified = await this.getLeadsToBeNotified(groupEntities);
      if (leadsToBeNotified.length === 0) return;

      const cacheClient = await this.cache.getClient();
      await this.notifyLeads(leadsToBeNotified, cacheClient);
    });
  }

  private async notifyLeads(leadsToBeNotified: Entity[], cacheClient: CacheService) {
    await withActiveSpan(tracer, 'notifyLeads', async span => {
      const gauge = metrics.getMeter('default')
        .createObservableGauge('catalog.provider.picpay.groups.notifications.unnamed', {
          description: 'Unnamed Groups notification sent',
        })

      const backendUrl = this.config.getOptionalString('backend.baseUrl');
      const days = this.config.getOptionalNumber('picpayEntityProvider.remainders.unnamedGroups.days') ?? 7;
      const template = this.config.getOptionalString('picpayEntityProvider.remainders.unnamedGroups.template');
      const defaultTemplate = `Hi there! Your group from PicPay needs a name. Please update it here: https://moonlight.limbo.work/create/templates/default/moonlight-template-additional-group-information-v2`;
      const ttl = 60 * 60 * 24 * days;

      span.addEvent('notifyLeads', { leadsToBeNotified: leadsToBeNotified.length });
      span.setAttribute('template', template ?? defaultTemplate);
      span.setAttribute('ttl_days', ttl);

      const result = {
        success: 0,
        failures: 0
      };

      gauge.addCallback(observableGauge => {
        observableGauge.observe(leadsToBeNotified.length, result);
      })

      for (const entity of leadsToBeNotified) {
        try {
          const leadRef = entity.spec?.leadRef;
          this.logger.debug(`Notifying lead ${entity.spec?.leadEmail} unnamed group ${entity.metadata.name}`);
          if (!leadRef) continue;

          const cacheKey = `picpay-group-provider:unnamed-reminder:${leadRef}`;
          if (await cacheClient.get(cacheKey)) continue;

          const response = await fetch(`${backendUrl}/api/slack/notify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: entity.spec?.leadEmail,
              userRef: leadRef,
              message: this.njucks.renderString(template ?? defaultTemplate, { entity }) ?? defaultTemplate
            }),
          });

          if (!response.ok) {
            this.logger.error(`Failed to notify Slack for group ${entity.metadata.name}`);
          }

          await cacheClient.set(cacheKey, { notified: true }, { ttl });
          result.success++;
        } catch (err: any) {
          this.logger.error(`Failed to notify lead ${entity.spec?.leadEmail}: ${err.message}`);
          result.failures++;
        }
      }
    });
  }

  private async getLeadsToBeNotified(groupEntities: Entity[]): Promise<Entity[]> {
    return groupEntities.filter(entity => {
      const unnamedGroup = entity.metadata.annotations?.['moonlight.picpay/unnamed-group'] === 'true';
      return entity.spec?.leadEmail && entity.spec?.leadRef && unnamedGroup;
    });
  }
}