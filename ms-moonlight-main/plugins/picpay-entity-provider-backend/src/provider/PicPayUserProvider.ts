import { Config } from '@backstage/config';
import {
  EntityProvider,
  EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { Entity } from '@backstage/catalog-model';
import { Database } from '../database/Database';
import { CacheClient, PluginCacheManager, PluginDatabaseManager } from '@backstage/backend-common';
import { EntityRef, PicPayUser } from './Record';
import { WebClient } from '@slack/web-api';
import {
  ANNOTATIONS_BASE,
  PicPayProvider,
} from './PicPayProvider';
import { userRefByEmail } from './utils';
import { Members } from '../database/tables';
import { SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import * as uuid from 'uuid';
import { Attributes, metrics, ObservableGauge, trace } from '@opentelemetry/api';
import { withActiveSpan, TRACER_ID } from '../utils/opentelemetry';
import pLimit from 'p-limit';

const tracer = trace.getTracer(TRACER_ID);

export class PicPayUserProvider
  extends PicPayProvider
  implements EntityProvider {
  private connection?: EntityProviderConnection;
  private scheduleFn?: () => Promise<void>;
  private gauge: ObservableGauge<Attributes>;
  private userNotifiedGauge: ObservableGauge<Attributes>;
  private userNotifiedCount = 0;

  private backendUrl: string;
  private reminderDays: number;
  private reminderTemplate: string | undefined;
  private reminderDefaultTemplate = `Hi there! We found the user {{ user.name }} out of one of your groups. Please inform which group this person is a part of`;

  protected constructor(
    protected readonly logger: Logger,
    protected readonly config: Config,
    protected readonly database: Database,
    protected readonly cache: PluginCacheManager,
    scheduleFn: 'manual' | SchedulerServiceTaskRunner,
    protected readonly slackApi?: WebClient,
  ) {
    super(logger, database, cache, config, slackApi);
    this.schedule(scheduleFn);
    this.backendUrl = this.config.getString('backend.baseUrl');
    this.reminderDays = this.config.getOptionalNumber('picpayEntityProvider.remainders.outOfGroups.days') ?? 7;
    this.reminderTemplate = this.config.getOptionalString('picpayEntityProvider.remainders.outOfGroups.template');
    this.gauge = metrics.getMeter('default')
      .createObservableGauge('catalog.provider.picpay.users.changes', {
        description: 'Changes from Users of PicPayProvider',
      });
    this.userNotifiedGauge = metrics.getMeter('default')
      .createObservableGauge('catalog.provider.picpay.leads.outofgroup.notified', {
        description: 'Number of leads that got notification of users out of groups',
      });
  }

  public static async create(
    logger: Logger,
    config: Config,
    databaseManager: PluginDatabaseManager,
    catalogDatabaseManager: PluginDatabaseManager,
    cache: PluginCacheManager,
    schedule: 'manual' | SchedulerServiceTaskRunner
  ) {
    const db = await Database.create(databaseManager, catalogDatabaseManager);

    let web: WebClient | undefined;

    const slackToken = config.getOptionalString(
      'slack.token'
    );

    if (slackToken) {
      web = new WebClient(
        config.getOptionalString('slack.token'),
        {
          timeout: 500,
          rejectRateLimitedCalls: true,
          retryConfig: {
            maxRetryTime: 1,
          },
        }
      );
    }

    return new PicPayUserProvider(logger.child({ plugin: 'picpay-user-provider' }), config, db, cache, schedule, web);
  }

  public getProviderName(): string {
    return `picpay-user-provider`;
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
    this.logger.info('Connecting to picpay-organization-chart');
    await this.scheduleFn?.();
  }

  public async run(): Promise<void> {
    return await withActiveSpan(tracer, 'PicPayUserProvider', async span => {

      if (!this.connection) {
        this.logger.error('No connection provided');
        return;
      }

      await this.loadGithubUsersInformation();
      await this.clearCache();
      await this.preloadAdditionalInformation(); // Preload additional info
      const cache = this.cache.getClient();

      const limit = pLimit(10); // Limit concurrency

      // Fetch all users at once
      let page = 1;
      const allUsers: PicPayUser[] = [];

      for (; ;) {
        const users = await this.database
          .microsoftAD()
          .listUsers({ perPage: 1000, page });

        if (!users.length) {
          break;
        }

        allUsers.push(...users);
        page++;
      }

      // Pre-fetch Slack and GitHub information in parallel
      const slackInfoPromises = allUsers.map(user => limit(() => this.getSlackInformation(user.email)));
      const githubInfoPromises = allUsers.map(user => limit(() => this.getGitHubUser(user.email)));

      const [slackInfos, githubInfos] = await Promise.all([
        Promise.all(slackInfoPromises),
        Promise.all(githubInfoPromises),
      ]);

      // Pre-fetch memberOf information in parallel
      const memberOfPromises = allUsers.map(user => limit(() => this.memberOf(user, cache)));
      const memberOfInfos = await Promise.all(memberOfPromises);

      const changes = { added: 0, removed: 0 };
      this.gauge.addCallback(observableGauge => {
        observableGauge.observe(changes.added + changes.removed, {
          added: changes.added,
          removed: changes.removed,
        });
      });

      this.userNotifiedCount = 0;

      const mutations = await Promise.all(allUsers.map((user, index) => limit(async () => {
        const userRef = userRefByEmail(user.email);
        if (!userRef) {
          return null;
        }

        const slackInformation = slackInfos[index];
        const githubUser = githubInfos[index];
        const memberOf = memberOfInfos[index];

        const links: any[] = [];

        if (githubUser?.login) {
          links.push({
            title: 'Github',
            url: `https://github.com/orgs/PicPay/people/${githubUser.login}`,
            icon: 'github',
          });
        }

        if (slackInformation?.slackId) {
          links.push({
            title: 'Slack',
            url: `https://picpay.enterprise.slack.com/user/@${slackInformation.slackId}`,
            icon: 'LiveHelpIcon',
          });
        }

        const newEntity = {
          apiVersion: 'backstage.io/v1alpha1',
          kind: 'User',
          metadata: {
            namespace: userRef.namespace!,
            name: userRef.name!,
            description: user.job_name || '',
            annotations: ANNOTATIONS_BASE,
            links,
          },
          spec: {
            memberOf: [
              ...memberOf,
              ...(githubUser?.teams?.map(
                (teamName: string) => `group:default/${teamName}`
              ) ?? []),
            ],
            profile: {
              displayName: user.name,
              email: user.email,
              picture: slackInformation?.picture ?? githubUser?.avatar,
            },
            github: {
              login: githubUser?.login,
            },
            slack: {
              id: slackInformation?.slackId,
            },
            isLead: user.is_lead,
            leadEmail: user.lead_email,
          },
        };

        if (
          user.active &&
          user.active.toString().toLowerCase() !== 'false'
        ) {
          this.logger.debug(
            `Adding user ${user.email} with groups ${newEntity.spec.memberOf}`
          );
          return { type: 'added', entity: newEntity };
        }
        this.logger.debug(`Removing user ${user.email}`);
        return { type: 'removed', entity: newEntity };
      })));

      const validMutations = mutations.filter(Boolean) as {
        type: 'added' | 'removed';
        entity: Entity;
      }[];

      const added = validMutations
        .filter((m) => m.type === 'added')
        .map((m) => ({
          entity: m.entity,
          locationKey: this.getProviderName(),
        }));

      const removed = validMutations
        .filter((m) => m.type === 'removed')
        .map((m) => ({
          entity: m.entity,
          locationKey: this.getProviderName(),
        }));

      changes.added += added.length;
      changes.removed += removed.length;

      await this.connection.applyMutation({
        type: 'delta',
        removed,
        added,
      });

      await this.database.refreshStateRepository().forceRefreshByLocationKey(
        this.getProviderName(),
        new Date()
      );

      this.userNotifiedGauge.addCallback(observableGauge => {
        observableGauge.observe(this.userNotifiedCount);
      });

      span.setAttribute('added', changes.added);
      span.setAttribute('removed', changes.removed);
    });
  }

  private async memberOf(user: PicPayUser, cache: CacheClient): Promise<string[]> {
    return await withActiveSpan(tracer, 'memberOf', async span => {
      span.setAttribute('user', user.email);
      const memberOf: string[] = [];
      const userRef = EntityRef.fromEmail(user.email, 'user').toString();

      span.setAttribute('is_lead', user.is_lead)
      if (user.is_lead) {
        const entityRefs = await this.realEntityRef(
          EntityRef.fromEmail(user.email, 'group')
        );

        for (const entityRef of entityRefs ?? []) {
          if (!entityRef.isValid()) continue;
          memberOf.push(entityRef.toString());
        }
      }

      let leadSplittedGroup = false;
      const userGroups = await this.realEntityRef(
        EntityRef.fromEmail(user.lead_email, 'group'),
        (members: Members[]) => { // this is a filter function
          if (members.length === 0) return true; // lead didnt split the group

          const userIsInASplittedGroup = members.some(e => e.entityRef.includes(userRef));
          leadSplittedGroup = !userIsInASplittedGroup;
          return userIsInASplittedGroup
        }
      );

      if (leadSplittedGroup && userGroups?.length === 0) {
        const leadGroups = await this.realEntityRef(EntityRef.fromEmail(user.lead_email, 'group'))
        await this.notifyUserOutOfGroups(user, userRef, leadGroups, cache);
      }

      for (const entityRef of userGroups ?? []) {
        if (!entityRef.isValid()) continue;
        memberOf.push(entityRef.toString());
      }

      span.setAttribute('entityRefs', memberOf.length);
      return memberOf;
    })
  }

  private async notifyUserOutOfGroups(user: PicPayUser, userRef: string, leadGroups: EntityRef[] | undefined, cache: CacheClient): Promise<void> {
    return await withActiveSpan(tracer, 'notifyUserOutOfGroups', async span => {
      const ttl = 60 * 60 * 24 * (this.reminderDays ?? 30);
      const leadRef = EntityRef.fromEmail(user.lead_email, 'user').toString();
      try {
        this.logger.debug(`Notifying lead ${leadRef} about user ${userRef} out of groups`);
        if (!leadRef || !user.lead_email) return;

        const cacheKey = `picpay-user-provider:outofgroup-reminder:${leadRef}`;
        if (await cache.get(cacheKey)) return;

        const body = {
          email: user.lead_email,
          message: this.njucks.renderString(this.reminderTemplate ?? this.reminderDefaultTemplate, { user }) ?? this.reminderDefaultTemplate,
          buttons: leadGroups?.map(group => ({
            "text": group.name,
            "value": JSON.stringify({
              userRef,
              leadRef: EntityRef.fromEmail(user.lead_email, "user").toString(),
              leadEmail: user.lead_email,
              group: {
                name: group.name,
                namespace: group.namespace,
                kind: 'group'
              }
            })
          })),
          callback: {
            url: `${this.backendUrl}/api/entity-provider/additional-information/webhooks/members`,
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            }
          }
        };

        const response = await fetch(`${this.backendUrl}/api/slack/notify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          this.logger.error(`Failed to notify Slack for group ${user.name}`);
        } else {
          this.userNotifiedCount++;
        }

        await cache.set(cacheKey, { notified: true }, { ttl });
      } catch (err: any) {
        this.logger.error(`Failed to notify lead ${leadRef}: ${err.message}`);
        span.recordException(err);
      }
    })
  }
}
