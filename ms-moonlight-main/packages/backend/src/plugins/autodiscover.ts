import {
  CatalogBuilder,
} from '@backstage/plugin-catalog-backend';
import { EntityProvider } from '@backstage/plugin-catalog-node';
import { PluginEnvironment } from '../types';
import {
  GithubOrgEntityProvider,
  GithubEntityProvider,
  GithubUser,
  TransformerContext,
  GithubOrgEntityProviderOptions,
  GithubTeam,
} from '@backstage/plugin-catalog-backend-module-github';

import * as winston from 'winston';
import {
  CustomEntityErrorProcessor,
  PicPayEntityProcessor,
  EntityProcessorIntermediator,
} from '@internal/plugin-picpay-custom-entity-processor-backend';
import { Entity, GroupEntity, stringifyEntityRef, UserEntity } from '@backstage/catalog-model';
import { readDurationFromConfig } from '@backstage/config';
import { durationToMilliseconds } from '@backstage/types';
import {
  PicPayGroupProvider,
  PicPayUserProvider,
} from '@internal/plugin-picpay-entity-provider-backend';
import { CatalogClient } from '@backstage/catalog-client';
import { Octokit } from 'octokit';
import { ScaffolderEntitiesProcessor } from '@backstage/plugin-catalog-backend-module-scaffolder-entity-model';
import { Router } from 'express';
import { UnprocessedEntitiesModule } from '@backstage/plugin-catalog-backend-module-unprocessed';
import { GithubWebhooksProvider, PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';
import { ScmIntegrations } from '@backstage/integration';
import { ImmediateEntityProvider } from '@internal/plugin-picpay-entity-provider-backend';

const PROVIDERS = process.env.PROVIDERS?.split(',') ?? ['entity-provider', 'org-provider', 'picpay-group-provider', 'picpay-user-provider', 'github-webhook-provider'];

class UserTransformer {
  static backendUrl: string;
  static logger: winston.Logger;
  static nonGithubUsers: Entity[] = [];
  static _octokitClient: Octokit;

  public static fromConfig(options: {
    backendUrl: string,
    logger: winston.Logger,
  }): typeof UserTransformer {
    UserTransformer.backendUrl = options.backendUrl;
    UserTransformer.logger = options.logger.child({ type: 'github-org-provider-user-transformer' });
    return UserTransformer;
  }

  static async fillUsers(backendUrl: string) {
    const that = UserTransformer;
    const request = new Request(`${backendUrl}/api/catalog/entities?filter=kind=User`);

    that.nonGithubUsers = await fetch(request).then(async response => {
      if (!response || !response.ok) {
        throw new Error(`unable to fetch entities from catalog`);
      }

      const entities: Entity[] = await response.json()
      that.nonGithubUsers = entities?.filter(
        ({ metadata, spec }) => {
          const location = metadata.annotations ? metadata.annotations['backstage.io/source-location'] : undefined;
          return spec?.github && (spec?.github as any)?.login && !location?.includes('github')
        }
      )
      that.logger.info(`Fetched ${that.nonGithubUsers.length} non-github users from catalog`);
      return Promise.resolve(that.nonGithubUsers);
    });
  }

  static async getUsers(): Promise<Entity[]> {
    return UserTransformer.nonGithubUsers;
  }

  static async teamTransformer(
    team: GithubTeam,
    _ctx: TransformerContext
  ): Promise<Entity | undefined> {
    const that = UserTransformer;
    const annotations: { [annotationName: string]: string } = {
      'github.com/team-slug': team.combinedSlug,
    };

    if (team.editTeamUrl) {
      annotations['backstage.io/edit-url'] = team.editTeamUrl;
    }

    const entity: GroupEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'Group',
      metadata: {
        name: team.slug,
        annotations,
      },
      spec: {
        type: 'team',
        profile: {},
        children: [],
      },
    };

    if (team.description) {
      entity.metadata.description = team.description;
    }
    if (team.name) {
      entity.spec.profile!.displayName = team.name;
    }
    if (team.avatarUrl) {
      entity.spec.profile!.picture = team.avatarUrl;
    }
    if (team.parentTeam) {
      entity.spec.parent = team.parentTeam.slug;
    }

    entity.spec.members = team.members.map(user => {
      const nonGithubUser = that.nonGithubUsers.find(
        (u) => (u.spec?.github as any)?.login === user.login
      );

      return nonGithubUser ? stringifyEntityRef(nonGithubUser) : user.login;
    });

    return entity;
  }

  static async userTransformer(
    item: GithubUser,
    _ctx: TransformerContext
  ): Promise<UserEntity | undefined> {
    if (process.env.AVOID_GITHUB_USERS) {
      return undefined;
    }
    const that = UserTransformer;

    that.logger.debug(`Processing user ${item.login} from github`);
    if (process.env.AVOID_GITHUB_DUPLICATED_USERS === 'true') {
      if (that.nonGithubUsers.length <= 0) {
        that.logger.debug(`first lap, fetching users from catalog`);
        await that.fillUsers(that.backendUrl);
      }

      const nonGithubUser = that.nonGithubUsers.find(
        (u) => (u.spec?.github as any)?.login === item.login
      );

      if (nonGithubUser) {
        that.logger.debug(`User ${item.login} already exists in catalog from different provider`);
        return undefined;
      }
    }

    that.logger.debug(`User ${item.login} is not in catalog, creating entity`);

    const entity: UserEntity = {
      apiVersion: 'backstage.io/v1alpha1',
      kind: 'User',
      metadata: {
        name: item.login,
        annotations: {
          'github.com/user-login': item.login,
        },
      },
      spec: {
        // @ts-ignore
        github: {
          login: item.login,
        },
        profile: {},
        memberOf: [],
      },
    };

    if (item.bio) entity.metadata.description = item.bio;
    if (item.name) entity.spec.profile!.displayName = item.name;
    if (item.avatarUrl) entity.spec.profile!.picture = item.avatarUrl;

    let ssoEmail = item.organizationVerifiedDomainEmails?.find(
      (e) => e.includes('picpay') || e.includes('picpaybank') || e.includes('ppay')
    );

    if (!ssoEmail) {
      const samlIdentity: any = await _ctx.client(`
        {
          organization(login: "PicPay") {
            samlIdentityProvider {
              externalIdentities(first: 1, login: "${item.login}") {
                edges {
                  node {
                    guid
                    samlIdentity {
                      nameId
                    }
                    user {
                      id
                      name
                      login
                      email
                    }
                  }
                }
                pageInfo {
                  endCursor
                  hasNextPage
                }
              }
            }
          }
        }
        `);

      if (samlIdentity?.organization?.samlIdentityProvider?.externalIdentities?.edges?.length > 0) {
        ssoEmail = samlIdentity.organization.samlIdentityProvider.externalIdentities.edges[0].node.samlIdentity.nameId;
      }
    }

    if (ssoEmail) {
      entity.spec.profile!.email = ssoEmail;
      if (ssoEmail.includes('ext.ppay.me')) {
        entity.metadata.namespace = 'external';
      }
    } else {
      that.logger.warn(`Unable to find SSO email for user ${item.login}`);
    }

    return entity;
  };
}

const getEntityProviderConfig = (
  logger: winston.Logger,
  env: PluginEnvironment,
  intervalSeconds: number,
  timeoutSeconds: number,
) => {
  if (!PROVIDERS?.includes('entity-provider')) {
    return {
      logger,
      schedule: { run: () => Promise.resolve() },
      scheduler: {
        triggerTask: () => Promise.resolve(),
        scheduleTask: () => Promise.resolve(),
        createScheduledTaskRunner: () => ({ run: () => Promise.resolve() }),
        getScheduledTasks: () => Promise.resolve([]),
      },
    };
  }
  return {
    logger,
    schedule: env.scheduler.createScheduledTaskRunner({
      frequency: { seconds: intervalSeconds },
      timeout: { seconds: timeoutSeconds },
    }),
    scheduler: env.scheduler,
    events: env.events,
  };
};

const getOrgProviderConfig = (
  logger: winston.Logger,
  env: PluginEnvironment,
  intervalSeconds: number,
  timeoutSeconds: number,
): GithubOrgEntityProviderOptions => {

  const transformerHelper = UserTransformer.fromConfig({ backendUrl: env.config.getString('backend.baseUrl'), logger: env.logger });

  if (!PROVIDERS?.includes('org-provider')) {
    return {
      logger,
      id: 'production',
      orgUrl: 'https://github.com/PicPay',
      schedule: 'manual',
      userTransformer: transformerHelper.userTransformer,
      teamTransformer: transformerHelper.teamTransformer,
    };
  }
  return {
    logger,
    id: 'production',
    orgUrl: 'https://github.com/PicPay',
    schedule: env.scheduler.createScheduledTaskRunner({
      frequency: { seconds: intervalSeconds },
      timeout: { seconds: timeoutSeconds },
    }),
    userTransformer: transformerHelper.userTransformer,
    teamTransformer: transformerHelper.teamTransformer,
  };
};

export default async function getProcessingEngine(
  logger: winston.Logger,
  catalogEnv: PluginEnvironment,
  picpayEntityProviderEnv: PluginEnvironment,
  intervalSeconds: number,
  timeoutSeconds: number,
  intermediators: EntityProcessorIntermediator[] = [],
  providers: Array<EntityProvider> = []
): Promise<Router> {
  const builder = CatalogBuilder.create(catalogEnv);
  builder.addProcessor(new ScaffolderEntitiesProcessor());
  builder.addProcessor(new PicPayEntityProcessor(logger, intermediators));

  const entityErrorProcessor = new CustomEntityErrorProcessor(
    catalogEnv.logger.child({ type: 'custom-entity-error-processor' }),
    catalogEnv.config,
    catalogEnv.scheduler,
    new CatalogClient({ discoveryApi: catalogEnv.discovery }),

  );
  builder.subscribe({
    onProcessingError:
      entityErrorProcessor.onProcessingError.bind(entityErrorProcessor),
  });

  await entityErrorProcessor.setupCleaner();
  await entityErrorProcessor.setupNotCatalogedRepos();

  logger.info(
    `Adding GitHubEntityProvider interval:${intervalSeconds}, timeout:${timeoutSeconds}`
  );

  // WEBHOOK strategy we're only using to register things on refresh_stage, so a cronjob can
  // grab in the next lap and process the change
  const entityProviderCfg = getEntityProviderConfig(
    logger,
    catalogEnv,
    intervalSeconds,
    timeoutSeconds,
  );
  const orgProviderCfg = getOrgProviderConfig(
    logger,
    catalogEnv,
    intervalSeconds,
    timeoutSeconds,
  );

  const entityProvider = GithubEntityProvider.fromConfig(
    catalogEnv.config,
    entityProviderCfg,
  ) as any;
  const orgProvider: any = GithubOrgEntityProvider.fromConfig(
    catalogEnv.config,
    orgProviderCfg
  );
  const immediate = new ImmediateEntityProvider({
    logger: catalogEnv.logger,
  });

  catalogEnv.events.subscribe({
    id: 'entity-provider',
    topics: ['entity'],
    onEvent: entityProvider,
  });
  catalogEnv.events.subscribe({
    id: 'org-provider',
    topics: ['org'],
    onEvent: orgProvider,
  });

  if (PROVIDERS?.includes('entity-provider')) {
    providers.push(entityProvider);
  }
  if (PROVIDERS?.includes('org-provider')) {
    providers.push(orgProvider);
  }
  if (PROVIDERS?.includes('picpay-group-provider')) {
    const picPayGroupProvider = await PicPayGroupProvider.create(
      picpayEntityProviderEnv.logger,
      picpayEntityProviderEnv.config,
      picpayEntityProviderEnv.database,
      catalogEnv.database,
      picpayEntityProviderEnv.cache,
      picpayEntityProviderEnv.scheduler.createScheduledTaskRunner({
        initialDelay: { seconds: 20 },
        frequency: { seconds: Number(process.env.PICPAY_PROVIDER_DISCOVERY_INTERVAL ?? intervalSeconds) },
        timeout: { seconds: Number(process.env.PICPAY_PROVIDER_DISCOVERY_TIMEOUT ?? timeoutSeconds) },
      })
    );
    providers.push(picPayGroupProvider);
  }
  if (PROVIDERS?.includes('picpay-user-provider')) {
    const picPayUserProvider = await PicPayUserProvider.create(
      picpayEntityProviderEnv.logger,
      picpayEntityProviderEnv.config,
      picpayEntityProviderEnv.database,
      catalogEnv.database,
      picpayEntityProviderEnv.cache,
      picpayEntityProviderEnv.scheduler.createScheduledTaskRunner({
        initialDelay: { seconds: 20 },
        frequency: { seconds: Number(process.env.PICPAY_PROVIDER_DISCOVERY_INTERVAL ?? intervalSeconds) },
        timeout: { seconds: Number(process.env.PICPAY_PROVIDER_DISCOVERY_TIMEOUT ?? timeoutSeconds) },
      })
    );
    providers.push(picPayUserProvider);
  }
  if (PROVIDERS?.includes('github-webhook-provider')) {
    const integrations = ScmIntegrations.fromConfig(catalogEnv.config);
    const frequency = Number(process.env.GITHUB_PROVIDER_DISCOVERY_INTERVAL ?? intervalSeconds);
    const githubWebhookProvider = await GithubWebhooksProvider.create(
      catalogEnv.logger,
      integrations,
      PicPayGithubCredentialsProvider.fromIntegrations(integrations),
      frequency,
      new CatalogClient({ discoveryApi: catalogEnv.discovery }),
      catalogEnv.scheduler.createScheduledTaskRunner({
        initialDelay: { seconds: 20 },
        frequency: { seconds: frequency },
        timeout: { seconds: Number(process.env.GITHUB_PROVIDER_DISCOVERY_TIMEOUT ?? timeoutSeconds) },
      }),
    );
    providers.push(githubWebhookProvider);
  }
  if (PROVIDERS?.includes('immediate')) {
    providers.push(immediate);
  }

  if (process.env.DISABLE_PROVIDERS !== 'true') {
    for (const provider of providers) {
      const providerName = typeof provider.getProviderName === 'function' ? provider.getProviderName() : provider.constructor.name;
      catalogEnv.logger.info(`adding provider ${providerName}`);
      builder.addEntityProvider(provider);
    }
  }

  const duration = readDurationFromConfig(catalogEnv.config, {
    key: 'catalog.processingInterval',
  });
  const seconds = Math.max(
    1,
    Math.round(durationToMilliseconds(duration) / 1000)
  );

  logger.info(`Entities update will occur on every ${seconds} seconds`);
  const { processingEngine, router } = await builder.build();

  const unprocessed = UnprocessedEntitiesModule.create({
    database: await catalogEnv.database.getClient(),
    router,
    permissions: catalogEnv.permissions,
    discovery: catalogEnv.discovery,
  });
  unprocessed.registerRoutes();

  if (PROVIDERS?.includes('immediate')) {
    router.use('/immediate', immediate.getRouter());
  }

  await processingEngine.start();
  return router;
}
