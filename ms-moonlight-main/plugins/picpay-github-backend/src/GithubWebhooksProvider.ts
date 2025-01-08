import { GithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';
import { Octokit } from '@octokit/rest';
import { CatalogClient } from '@backstage/catalog-client';
import {
    DEFAULT_NAMESPACE,
    Entity,
    stringifyEntityRef,
    RELATION_DEPENDENCY_OF,
} from '@backstage/catalog-model';
import {
    EntityProvider,
    EntityProviderConnection,
} from '@backstage/plugin-catalog-node';
import { Logger } from 'winston';
import { SchedulerServiceTaskRunner } from '@backstage/backend-plugin-api';
import * as uuid from 'uuid';
import * as crypto from 'crypto';

type Changes = Map<string, { [repo: string]: 'added' | 'removed' }>;

export const ANNOTATIONS_BASE = {
    'backstage.io/managed-by-location': 'picpay://github-webhook-provider',
    'backstage.io/managed-by-origin-location': 'picpay://github-webhook-provider',
    'backstage.io/source-location': 'picpay://github-webhook-provider',
};

export class GithubWebhooksProvider implements EntityProvider {
    private entities: Map<string, Entity[]> = new Map();
    private frequency: number;
    private webhooks: Entity[] = [];
    private catalog: CatalogClient;
    private logger: Logger;
    private connection?: EntityProviderConnection;
    private scheduleFn?: () => Promise<void>;
    private credentialsProvider: GithubCredentialsProvider;
    private scmIntegrations: ScmIntegrations;

    public static async create(
        logger: Logger,
        scmIntegrations: ScmIntegrations,
        credentialsProvider: GithubCredentialsProvider,
        frequency: number,
        catalog: CatalogClient,
        schedule: 'manual' | SchedulerServiceTaskRunner,
    ) {
        return new GithubWebhooksProvider(
            logger.child({ plugin: 'github-webhook-provider' }),
            scmIntegrations,
            credentialsProvider,
            frequency,
            catalog,
            schedule,
        );
    }

    protected constructor(
        logger: Logger,
        scmIntegrations: ScmIntegrations,
        credentialsProvider: GithubCredentialsProvider,
        frequency: number,
        catalog: CatalogClient,
        scheduleFn?: 'manual' | SchedulerServiceTaskRunner,
    ) {
        this.logger = logger;
        this.scmIntegrations = scmIntegrations;
        this.catalog = catalog;
        this.frequency = frequency;
        this.credentialsProvider = credentialsProvider;
        this.schedule(scheduleFn);
    }

    public getProviderName(): string {
        return `github-webhook-provider`;
    }

    public async connect(connection: EntityProviderConnection): Promise<void> {
        this.connection = connection;
        this.logger.info(`Connecting to ${this.getProviderName()}`);
        await this.scheduleFn?.();
    }

    public async run(): Promise<void> {
        this.logger.info(`Running ${this.getProviderName()}`);
        if (this.connection) {
            await this.process();
            this.logger.info(`${this.getProviderName()} finished with ${this.webhooks.length} entities`);
            await this.connection.applyMutation({
                type: 'full',
                entities: this.webhooks.map(entity => ({ entity, locationKey: this.getProviderName() })),
            });
        }
    }

    private schedule(schedule?: 'manual' | SchedulerServiceTaskRunner) {
        if (!schedule || schedule === 'manual') {
            return;
        }

        this.logger.info(
            `Scheduling ${this.getProviderName()} refresh every ${this.frequency} seconds`,
        );
        this.scheduleFn = async () => {
            const id = `${this.getProviderName()}:refresh`;
            await schedule.run({
                id,
                fn: async () => {
                    const logger = this.logger.child({
                        taskId: id,
                        taskInstanceId: uuid.v4(),
                    });

                    try {
                        await this.run();
                    } catch (error) {
                        logger.error(`${this.getProviderName()} refresh failed, ${error}`, error);
                    }
                },
            });
        };
    }

    private async process(): Promise<void> {
        await this.fillEntities();
        if (this.webhooks.length === 0) {
            await this.runAll();
        } else {
            await this.auditlogs();
        }
    }

    private async getOctokit(): Promise<Octokit> {
        const { token } = await this.credentialsProvider.getCredentials({
            url: 'https://github.com/PicPay/ms-moonlight',
        });
        return new Octokit({
            ...this.scmIntegrations,
            auth: token,
            baseUrl: 'https://api.github.com',
            headers: {
                Accept: 'application/vnd.github.machine-man-preview+json',
            },
            previews: ['nebula-preview'],
        });
    }

    private async fillEntities(): Promise<void> {
        const webhooks = [];
        const entities = await this.catalog.getEntities({
            filter: [
                { kind: 'Component' },
                { kind: 'System' },
                { kind: 'Template' },
                { kind: 'Resource', 'spec.type': 'webhook' },
            ],
            fields: ['metadata', 'kind', 'apiVersion', 'spec', 'relations'],
        });
        for (const entity of entities.items) {
            const sourceLocation =
                (entity.metadata.annotations?.['backstage.io/source-location'] as string) ?? '';
            if (sourceLocation !== '' && entity.kind !== 'Resource') {
                const key = sourceLocation.match(/github\.com\/[^/]+\/([^/]+)/)?.[1] || '';
                if (!this.entities.has(key)) {
                    this.entities.set(key, []);
                }
                this.entities.get(key)?.push(entity);
            }
            if (entity.spec?.type === 'webhook') {
                webhooks.push(entity);
            }
        }
        this.webhooks = webhooks;
    }

    private async auditlogs(): Promise<void> {
        const hooks = await this.paginateAuditLogs();
        this.logger.debug(`found ${hooks.size} hooks`);

        for (const w of this.webhooks) {
            const key = w.metadata.annotations?.['moonlight.picpay/webhook-url'] || '';
            const hookRepos = hooks.get(key);
            if (hookRepos) {
                this.updateWebhookDependencies(w, hookRepos);
                hooks.delete(key);
            }
        }

        const newWebhooks = await this.hooksToEntity(hooks);
        this.addNewWebhooks(newWebhooks, hooks);
        this.logger.debug(`found ${newWebhooks.length} new webhooks`);
        this.webhooks.push(...newWebhooks);
    }

    private async paginateAuditLogs(): Promise<Changes> {
        const hooks: Changes = new Map();
        let octokit = await this.getOctokit();
        let hasNextPage = true;
        let afterCursor: string | undefined = undefined;

        const parseLinkHeader = (header: string) => {
            const linkHeadersArray = header.split(',').map(headerPart => headerPart.trim());
            const links: Record<string, { url: string; after?: string | null }> = {};

            linkHeadersArray.forEach(linkHeader => {
                const match = linkHeader.match(/<([^>]*)>; rel="([^"]*)"/);
                if (match) {
                    const url = match[1];
                    const rel = match[2];
                    const urlObj = new URL(url);
                    const after = urlObj.searchParams.get('after');

                    links[rel] = {
                        url,
                        after,
                    };
                }
            });

            return links;
        };

        do {
            try {
                const params: Record<string, any> = {
                    org: 'PicPay',
                    per_page: 100,
                    include: 'web',
                    created_after: new Date(Date.now() - this.frequency * 1000).toISOString(),
                    phrase:
                        'action:hook.config_changed OR action:hook.events_changed OR action:hook.destroy OR action:hook.active_changed OR action:hook.create OR action:hook.delete OR action:hook.update',
                };

                if (afterCursor) {
                    params.after = afterCursor;
                }
                this.logger.debug(`fetching audit logs page after ${afterCursor}`);
                const { data, headers } = await octokit.request('GET /orgs/{org}/audit-log', params);

                for (const item of data) {
                    const type = ['hook.destroy', 'hook.deleted'].includes(item.action)
                        ? 'removed'
                        : 'added';
                    if (!item.repo || !item.config?.url) {
                        continue;
                    }
                    const url = item.config.url;
                    const repoName = item.repo.replace('PicPay/', '');
                    if (!hooks.has(url)) {
                        hooks.set(url, {});
                    }
                    hooks.get(url)![repoName] = type;
                }

                const linkHeader = headers.link ?? headers.Link as string;
                if (linkHeader) {
                    const parsed = parseLinkHeader(linkHeader);
                    if (parsed.next) {
                        const urlObj = new URL(parsed.next.url);
                        let nextCursor: string | null | undefined = null;
                        nextCursor = parsed.next.after;
                        if (!nextCursor) {
                            const nextPage = urlObj.searchParams.get('page');
                            if (nextPage) {
                                nextCursor = nextPage;
                            }
                        }

                        if (nextCursor) {
                            afterCursor = nextCursor;
                        } else {
                            hasNextPage = false;
                        }
                    } else {
                        hasNextPage = false;
                    }
                } else {
                    hasNextPage = false;
                }
            } catch (err: any) {
                if (err.status === 403) {
                    this.logger.debug('Token expired or rate limit reached, refreshing');
                    octokit = await this.getOctokit();
                } else {
                    this.logger.error(err.stack);
                    throw err;
                }
            }
        } while (hasNextPage);

        return hooks;
    }

    private async runAll(): Promise<void> {
        const webhooks: Changes = new Map();

        const allRepositories: { name: string }[] = await this.fetchAllRepositories();

        const concurrencyLimit = 5;
        let index = 0;
        const totalRepos = allRepositories.length;

        while (index < totalRepos) {
            const batch = allRepositories.slice(index, index + concurrencyLimit);

            const promises = batch.map(repo => this.processRepositoryWebhooks(repo, webhooks));

            await Promise.all(promises);
            index += concurrencyLimit;
        }

        const newEntities = await this.hooksToEntity(webhooks);
        this.webhooks = newEntities;
    }

    private async fetchAllRepositories(): Promise<{ name: string }[]> {
        const repositories: { name: string }[] = [];
        let page = 1;
        let octokit = await this.getOctokit();

        for (; ;) {
            try {
                const repositoriesResponse = await octokit.rest.repos.listForOrg({
                    org: 'PicPay',
                    per_page: 100,
                    page,
                });

                const repos = repositoriesResponse.data;

                if (repos.length === 0 || (process.env.NODE_ENV === 'development' && page > 1)) {
                    break;
                } else {
                    this.logger.debug(`Processing page ${page} with ${repos.length} repositories`);
                    repositories.push(...repos.map(repo => ({ name: repo.name })));
                    page++;
                }
            } catch (err: any) {
                if (err.status === 403) {
                    this.logger.debug('Token expired or rate limit reached, refreshing');
                    octokit = await this.getOctokit();
                } else {
                    this.logger.error(err.stack);
                    throw err;
                }
            }
        }

        return repositories;
    }

    private async processRepositoryWebhooks(
        repo: { name: string },
        webhooks: Changes,
    ): Promise<void> {
        let webhookPage = 1;
        let octokit = await this.getOctokit();

        for (; ;) {
            try {
                const hooksResponse = await octokit.rest.repos.listWebhooks({
                    owner: 'PicPay',
                    repo: repo.name,
                    per_page: 100,
                    page: webhookPage,
                });

                const hooks = hooksResponse.data;

                if (hooks.length === 0) {
                    break;
                }
                for (const w of hooks) {
                    if (!w.config.url) continue;
                    const repoName = repo.name;
                    const url = w.config.url;
                    if (!webhooks.has(url)) {
                        webhooks.set(url, {});
                    }
                    webhooks.get(url)![repoName] = 'added';
                }
                webhookPage++;
            } catch (err: any) {
                if (err.status === 403) {
                    this.logger.debug('Token expired or rate limit reached, refreshing');
                    octokit = await this.getOctokit();
                } else {
                    this.logger.error(`Failed to fetch webhooks for repo ${repo.name}: ${err.stack}`);
                }
            }
        }
    }

    private updateWebhookDependencies(webhook: Entity, hookRepos: { [repo: string]: 'added' | 'removed' }): void {
        for (const [repo, type] of Object.entries(hookRepos)) {
            const repoEntities = this.entities.get(repo) || [];
            const repoEntityRefs = repoEntities.map(e => stringifyEntityRef(e));
            for (const entityRef of repoEntityRefs) {
                let dependencies = (webhook.spec?.[RELATION_DEPENDENCY_OF] as string[]) || [];
                if (type === 'added' && !dependencies.includes(entityRef)) {
                    dependencies.push(entityRef);
                } else if (type === 'removed' && dependencies.includes(entityRef)) {
                    dependencies = dependencies.filter(r => r !== entityRef);
                }
                webhook.spec = {
                    ...(webhook.spec ?? {}),
                    [RELATION_DEPENDENCY_OF]: dependencies,
                };
            }
        }
    }

    private async addNewWebhooks(newWebhooks: Entity[], hooks: Changes): Promise<void> {
        for (const [repo, type] of Object.entries(hooks)) {
            const repoEntities = this.entities.get(repo) || [];
            const repoEntityRefs = repoEntities.map(e => stringifyEntityRef(e));
            for (const entityRef of repoEntityRefs) {
                for (const newWebhook of newWebhooks) {
                    const dependencies = (newWebhook.spec?.[RELATION_DEPENDENCY_OF] as string[]) || [];
                    if (type === 'added' && !dependencies.includes(entityRef)) {
                        dependencies.push(entityRef);
                    }
                    newWebhook.spec = {
                        ...(newWebhook.spec ?? {}),
                        [RELATION_DEPENDENCY_OF]: dependencies,
                    };
                }
            }
        }
    }

    private async hooksToEntity(hooks: Changes): Promise<Entity[]> {
        const resources: Entity[] = [];
        for (const [url, repos] of hooks) {
            const hashedUrl = crypto.createHash('md5').update(url.split('?')[0]).digest('hex');
            const existingWebhook = this.webhooks.find(
                w => w.metadata.name === `webhook-${hashedUrl}`,
            );
            if (existingWebhook) {
                continue;
            }
            const relations = Object.entries(repos)
                .filter(([_repo, status]) => status !== 'removed')
                .flatMap(([repo]) => {
                    const entities = this.entities.get(repo) || [];
                    return entities.map(entity => stringifyEntityRef(entity));
                });

            resources.push({
                apiVersion: 'backstage.io/v1alpha1',
                kind: 'Resource',
                metadata: {
                    name: `webhook-${hashedUrl}`,
                    namespace: DEFAULT_NAMESPACE,
                    description: `Webhook for ${url}`,
                    annotations: {
                        ...ANNOTATIONS_BASE,
                        'moonlight.picpay/webhook-url': url,
                    },
                },
                spec: {
                    type: 'webhook',
                    owner: 'unknown',
                    lifecycle: 'production',
                    [RELATION_DEPENDENCY_OF]: relations,
                },
            });
        }

        return resources;
    }
}