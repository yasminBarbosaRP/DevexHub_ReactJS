import { Entity } from "@backstage/catalog-model";
import * as winston from "winston";
import {
    GithubCredentialsProvider,
    ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from "octokit";
import { ConfigApi } from "@backstage/core-plugin-api";
import crypto from 'crypto';
import { PluginTaskScheduler } from '@backstage/backend-tasks';
import { CatalogApi } from '@backstage/catalog-client';
import { PicPayGithubCredentialsProvider } from "@internal/plugin-picpay-github-backend";
import { metrics, Meter } from '@opentelemetry/api';

const sourceLocationRegex = /PicPay\/(.*?)\/tree/;
const homologShutdownHours = new Set([0, 1, 2, 3, 4, 5, 6, 7, 19, 20, 21, 22, 23]);

const meter: Meter = metrics.getMeter('default');

export class CustomEntityErrorProcessor {

    private catalogLabel: {
        id?: number;
        name?: string;
        description?: string | null;
        color?: string | null;
    } = {
            name: 'moonlight-catalog',
            color: 'f29513'
        }

    constructor(
        private readonly logger: winston.Logger,
        private readonly config: ConfigApi,
        private readonly scheduler: PluginTaskScheduler,
        private readonly catalogApi: CatalogApi,
    ) { }

    private getClientOctokit(repoName: string): Promise<Octokit> {
        const integrations = ScmIntegrations.fromConfig(this.config);
        const githubCredentialsProvider: GithubCredentialsProvider =
            PicPayGithubCredentialsProvider.fromIntegrations(integrations);

        return githubCredentialsProvider.getCredentials({
            url: `https://github.com/PicPay/${repoName}`,
        }).then(credentialProviderToken => {
            return new Octokit({
                ...integrations,
                baseUrl: 'https://api.github.com',
                headers: {
                    Accept: 'application/vnd.github.v3+json',
                },
                auth: credentialProviderToken?.token,
                previews: ['nebula-preview'],
            });
        });
    }

    private isDiff(previous: string, actual: string): boolean {
        const hashPrevious = crypto.createHash('md5').update(this.rawBody(previous)).digest('hex');
        const hashActual = crypto.createHash('md5').update(this.rawBody(actual)).digest('hex');

        this.logger.debug(`isDiff: hashPrevious=${hashPrevious}, hashActual=${hashActual}`)
        return hashPrevious !== hashActual;
    }

    private rawBody(body: string): string {
        return body.split(`<p><b>Analysis`)[0];
    }

    private fullBody(body: string): string {
        return `${body}<p><b>Analysis at</b>: ${new Date().toISOString()}</p>`;
    }

    private createOrUpdateIssue(org: string, entity: string, repo: string, title: string, body: string, additionalLabels: string[] = []) {
        this.getClientOctokit(repo).then(octokit => {
            return octokit.rest.issues.listForRepo({
                owner: org,
                repo,
                state: 'open',
                list: 'all',
                labels: this.catalogLabel.name,
            }).then(({ data: issueList }): void => {
                let previousIssue;
                for (const issue of issueList) {
                    const labels = issue.labels.map(l => typeof l === 'string' ? l : l.name);
                    this.logger.debug(`onProcessingError: author of issue=${issue?.user?.login}`)
                    if ((issue?.user?.login.includes('moonlight')) && labels.includes(`entity:${entity}`)) {
                        this.logger.debug(`onProcessingError: Issue for repo with error already exists: ${issue.html_url}`);
                        previousIssue = issue;
                        break;
                    }
                }
                if (previousIssue?.number && this.isDiff(previousIssue?.body || "", body)) {
                    this.logger.debug(`onProcessingError: Issue for repo with error has diff, updating issue ${previousIssue?.number}`)
                    this.updateIssue(octokit, previousIssue?.number, org, entity, repo, title, body, additionalLabels);
                    return;
                }
                if (!previousIssue?.id) {
                    this.createIssue(octokit, org, entity, repo, title, body, additionalLabels);
                    return;
                }
                return;
            }).catch(err => {
                if (err.response?.status === 404) {
                    return this.createIssue(octokit, org, entity, repo, title, body);
                }
                throw err;
            });
        }).catch(err => {
            throw err;
        })
    }

    private createIssue(octokit: Octokit, org: string, entity: string, repo: string, title: string, body: string, additionalLabels: string[] = []): Promise<boolean> {
        const labels = [this.catalogLabel, `entity:${entity}`, ...additionalLabels]
            .map(label => typeof label === "string" && label.length > 50 ? label.slice(0, 50) : label);
        return octokit.rest.issues.create({
            owner: org,
            repo,
            title,
            body: this.fullBody(body),
            labels
        }).then(({ data: refData }) => {
            this.logger.debug(`onProcessingError: Issue for repo with error created: ${refData.html_url}`);
            return true;
        }).catch((err: any) => {
            this.logger.error(`onProcessingError: Issue for repo with error failed with status=${err.response?.status}, data=${JSON.stringify(err.response?.data)} at ${err.stack}`);
            return false;
        });
    }

    private updateIssue(octokit: Octokit, issueNumber: number, org: string, entity: string, repo: string, title: string, body: string, additionalLabels: string[] = []): Promise<void> {
        const labels = [this.catalogLabel, `entity:${entity}`, ...additionalLabels]
            .map(label => typeof label === "string" && label.length > 50 ? label.slice(0, 50) : label);
        this.logger.debug(`updateIssue:${issueNumber} for entity ${entity} in repo ${org}/${repo}`)
        return octokit.rest.issues.update({
            owner: org,
            repo,
            issue_number: issueNumber,
            title,
            body: this.fullBody(body),
            labels
        }).then(({ data: refData }) => {
            this.logger.debug(`onProcessingError: Issue for repo with error updated: ${refData.html_url}`);
        }).catch((err: any) => {
            this.logger.error(`onProcessingError: Issue for repo with error failed with status=${err.response?.status}, data=${JSON.stringify(err.response?.data)} at ${err.stack}`);
            throw err;
        });
    }

    private getOrganizationAndRepository(annotations: { [key: string]: string }): [string | undefined, string | undefined] {
        for (const key of [
            'backstage.io/source-location',
            'backstage.io/managed-by-location',
        ]) {
            if (annotations[key]) {
                const match = sourceLocationRegex.exec(annotations[key]);
                if (match && match[1]) {
                    return ['PicPay', match[1]];
                }
            }
        }

        this.logger.debug(`annotations222=${JSON.stringify(annotations)} project-slug=${annotations['github.com/project-slug']}`)
        if (annotations['github.com/project-slug']) {
            const [org, repo] = annotations['github.com/project-slug'].split('/');
            if (org && repo) {
                return [org, repo];
            }
        }

        return [undefined, undefined];
    }

    private shouldIgnoreError(errors: string[]): boolean {
        const isHomologShutdownHour = homologShutdownHours.has(new Date().getHours());
        const is503Error = errors.length === 1 && errors[0].includes('503');
        const isQAEnvironment = errors[0].includes('.qa') || errors[0].includes('-qa');

        return is503Error && isQAEnvironment && isHomologShutdownHour;
    }

    private getCategories(errors: string[]): string[] {
        const categories: string[] = [];
        for (const error of errors) {
            if (
                error.includes('PlaceholderProcessor') ||
                error.includes('does not exist') ||
                error.includes('could not be read')
            ) {
                categories.push('moonlight-catalog:invalid-reference');
            }
            if (error.includes('must be')) {
                categories.push('moonlight-catalog:invalid-field-value');
            }
        }
        return categories;
    }

    async setupCleaner() {
        if (!process.env.ISSUES_CLEANER_FOR_INVALID_CATALOG) return;

        const baseUrl = this.config.getString('backend.baseUrl');

        const taskRunner = this.scheduler.createScheduledTaskRunner({
            frequency: { minutes: 30 },
            timeout: { minutes: 30 },
            initialDelay: { minutes: 1 },
        });

        await taskRunner.run({
            id: 'entityErrorCleaner',
            fn: async () => {
                const promIssuesClosed = meter.createCounter('catalog_repo_issues_closed', {
                    description: 'Amount of Issues closed due fixes on catalog-info files',
                });
                const promProcessingDuration = meter.createHistogram('catalog_repo_issues_closed_duration_seconds', {
                    description: 'Time spent executing the full processing of issues closed due fixes on catalog-info files',
                });
                const startTime = Date.now()

                this.logger.debug(`setupCleaner: running`);
                try {
                    const octokit = await this.getClientOctokit("ms-moonlight");
                    const { data: issueList } = await octokit.rest.search.issuesAndPullRequests({
                        q: `is:open label:${this.catalogLabel.name}`,
                        per_page: 100,
                    });

                    for (const issue of issueList.items) {
                        const repository = issue.repository_url.split('/').pop();
                        const match = issue.body?.match(/backstage\.io\/managed-by-location":"(.*?)"/);

                        if (match && repository) {
                            const sourceLocation = match[1];
                            this.logger.debug(`setupCleaner: sourceLocation=${sourceLocation}`);
                            const res = await fetch(`${baseUrl}/api/catalog/locations?dryRun=true`, {
                                method: "POST",
                                body: JSON.stringify({ type: "url", target: sourceLocation }),
                            });

                            if (!res.ok) {
                                this.logger.debug(`setupCleaner: issue ${issue.html_url} cannot be closed, response:${JSON.stringify(res.body)}`);
                                continue;
                            }

                            this.logger.debug(`setupCleaner: removing issue ${issue.html_url}`);
                            await octokit.rest.issues.update({
                                owner: 'PicPay',
                                repo: repository,
                                issue_number: issue.number,
                                state: 'closed',
                                comments: `Automatically closed by Moonlight because the error was resolved.<p>Closed At: ${new Date().toISOString()}</p>`,
                            });
                            promIssuesClosed.add(1, { result: 'success' });
                        }
                    }
                    promProcessingDuration.record(Date.now() - startTime, { result: 'success' });
                } catch (err: any) {
                    promProcessingDuration.record(Date.now() - startTime, { result: 'error' });
                }
            },
        });
    }

    async setupNotCatalogedRepos() {
        if (!process.env.ISSUES_FOR_NOT_CATALOGED_REPOS) return;

        const taskRunner = this.scheduler.createScheduledTaskRunner({
            frequency: { minutes: 30 },
            timeout: { minutes: 30 },
            initialDelay: { minutes: 1 },
        });

        await taskRunner.run({
            id: 'notCatalogedRepositoryNotifier',
            fn: async () => {
                const promIssuesOpened = meter.createCounter('catalog_repo_issues_opened_not_cataloged', {
                    description: 'Amount of Issues opened for not cataloged repositories',
                });
                const promProcessingDurationRepo = meter.createHistogram('catalog_repo_issues_opened_not_cataloged_duration_seconds', {
                    description: 'Time spent executing the full processing of issues closed for not cataloged repositories',
                });
                const startTime = Date.now()

                this.logger.debug(`notCatalogedRepositoryNotifier: running`);
                try {
                    const locationData = await this.catalogApi.getEntities({ filter: { kind: 'Location' } });
                    const octokit = await this.getClientOctokit("ms-moonlight");
                    let page = 1;
                    const shouldContinue = true;
                    while (shouldContinue) {
                        const { data: repositories } = await octokit.rest.repos.listForOrg({
                            org: 'PicPay',
                            per_page: 100,
                            page,
                        });

                        if (repositories.length === 0) {
                            break;
                        }

                        for (const repo of repositories) {
                            if (repo.visibility === 'public' || repo.archived) {
                                continue;
                            }

                            const alreadyInCatalog = locationData.items.find((location) => location?.metadata?.annotations && location.metadata.annotations['github.com/project-slug'] === `${repo.owner.login}/${repo.name}`);

                            if (alreadyInCatalog) {
                                this.logger.debug(`notCatalogedRepositoryNotifier: repo ${repo.name} already in catalog`);
                                continue;
                            }

                            const { data: issueList } = await octokit.rest.issues.listForRepo({
                                owner: 'PicPay',
                                repo: repo.name,
                                state: 'open',
                                list: 'all',
                                labels: this.catalogLabel.name,
                            });

                            if (!issueList.find(issue => issue?.user?.login.includes('moonlight'))) {
                                const issueCreated = await this.createIssue(
                                    octokit,
                                    'PicPay',
                                    repo.name,
                                    repo.name,
                                    'Moonlight Catalog: Repository not cataloged',
                                    `Moonlight detected that the repository is not cataloged, a \`catalog-info.yaml\` in your root project is required.<br/>\n\n<p>For more information, please contact <b>#suporte-developer-experience</b> on Slack.</p>`,
                                    ['not-cataloged']
                                );
                                if (issueCreated) {
                                    promIssuesOpened.add(1, { result: 'success' });
                                    this.logger.debug(`notCatalogedRepositoryNotifier: creating issue for not cataloged repo ${repo.name}`);
                                }
                            }
                        }
                        page++;
                    }
                    promProcessingDurationRepo.record(Date.now() - startTime, { result: 'success' });
                } catch (err: any) {
                    this.logger.error(`notCatalogedRepositoryNotifier failed with status=${err.response?.status}, data=${JSON.stringify(err.response?.data)} at ${err.stack}`);
                    promProcessingDurationRepo.record(Date.now() - startTime, { result: 'error' });
                }
            },
        });
    }

    onProcessingError(event: {
        unprocessedEntity: Entity;
        errors: Error[];
    }) {
        try {
            this.logger.debug(`onProcessingError for entity ${event.unprocessedEntity.metadata.name}`)
            if (!process.env.ISSUES_FOR_ENTITY_WITH_ERROR) {
                this.logger.debug(`onProcessingError is disabled, skiping`)
                return;
            }

            if (['User', 'Group'].includes(event.unprocessedEntity.kind)) {
                this.logger.debug('onProcessingError: ignoring for entity kind User or Group')
                return;
            }
            const [org, repo] = this.getOrganizationAndRepository(event.unprocessedEntity?.metadata?.annotations || {});
            if (!org || !repo) {
                this.logger.warn(
                    `onProcessingError: invalid github.com/project-slug annotation found for entity ${event.unprocessedEntity.metadata.name}`
                );
                return;
            }
            const errors = event.errors.map(e => e.message);
            if (this.shouldIgnoreError(errors)) {
                this.logger.debug(`onProcessingError: ignoring error for repo ${org}/${repo}`)
                return;
            }
            this.logger.debug(`onProcessingError: creating issue for repo ${org}/${repo}`)
            const entityName = event.unprocessedEntity.metadata.name;
            const title = `Moonlight Catalog: Entity ${entityName} is invalid`;
            const body = `Moonlight encountered errors while processing the catalog-info.yaml file for one of your projects and cannot continue with entity ingestion for the following reasons:<br/>\n\n- ${errors.join('\n- ')}\n\n<details><summary>Check which entity is invalid</summary>\n\n\`\`\`${JSON.stringify(event.unprocessedEntity)}\`\`\`\n\n</details>\n<p>For more information, please contact <b>#suporte-developer-experience</b> on Slack.</p>`;
            this.createOrUpdateIssue(org, entityName, repo, title, body, this.getCategories(errors));
        } catch (err: any) {
            this.logger.error(`onProcessingError failed with status=${err.response?.status}, data=${JSON.stringify(err.response?.data)}`)
        }
    }
}
