/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import parseGitUrl from 'git-url-parse';
import { GITHUB_API_BASE_URL, GithubAppConfig, GithubIntegrationConfig } from './config';
import { createAppAuth } from '@octokit/auth-app';
import { Octokit, RestEndpointMethodTypes } from '@octokit/rest';
import { DateTime } from 'luxon';
import { getRootLogger } from '@backstage/backend-common';
import * as winston from 'winston';
import { ScmIntegrationRegistry } from '@backstage/integration';
import {
  GithubCredentials,
  GithubCredentialsProvider,
  GithubCredentialType,
} from './types';
import { metrics, ObservableGauge } from '@opentelemetry/api';

type InstallationData = {
  installationId: number;
  suspended: boolean;
};

type InstallationTokenData = {
  token: string;
  installationId: number;
  expiresAt: DateTime;
  repositories?: String[];
  rateLimit?: {
    fetchedAt: DateTime;
    limit: number;
    remaining: number;
    reset: number;
    used: number;
  }
};

class Cache {
  private readonly tokenCache = new Map<string, InstallationTokenData>();
  private gauge: ObservableGauge;
  private rateLimits = new Map<string, number>();

  constructor(private readonly logger: winston.Logger, private readonly baseUrl: string) {
    this.gauge = metrics.getMeter('default').createObservableGauge('github_token_rate_limits_available', {
      description: 'Available rate limits for GitHub tokens',
    });

    this.gauge.addCallback((observableResult) => {
      this.rateLimits.forEach((remaining, installationId) => {
        observableResult.observe(remaining, { installation_id: installationId });
      });
    });
  }

  async getOrCreateToken(
    appId: number,
    owner: string,
    repo: string | undefined,
    supplier: () => Promise<InstallationTokenData>,
  ): Promise<{
    accessToken: string,
    installationId: number,
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
      fetchedAt: DateTime;
    }
  }> {
    const cacheKey = `${owner}_${appId}`
    let existingInstallationData = this.tokenCache.get(cacheKey);
    let updateCache = false;
    if (
      !existingInstallationData ||
      this.isExpired(existingInstallationData.expiresAt)
    ) {
      existingInstallationData = await supplier();
      // Allow 10 minutes grace to account for clock skew
      existingInstallationData.expiresAt =
        existingInstallationData.expiresAt.minus({ minutes: 10 });
      updateCache = true;
    }

    const shouldRefresh = !existingInstallationData.rateLimit || this.isTooOld(existingInstallationData.rateLimit.fetchedAt);
    if (shouldRefresh) {
      const reason = !existingInstallationData.rateLimit ? 'didnt came from issuer' : `because it is too old, fetched at ${existingInstallationData.rateLimit.fetchedAt.toISO()}`
      this.logger.debug(`githubAppManager.getOrCreateToken refreshing rate limit for installation ${existingInstallationData.installationId} ${reason}`);
      const installationClient = new Octokit({
        baseUrl: this.baseUrl,
        auth: existingInstallationData.token,
      });
      existingInstallationData.rateLimit = {
        ...(await installationClient.rateLimit.get()).data.rate,
        fetchedAt: DateTime.local(),
      }
      updateCache = true;
    }

    if (updateCache) {
      this.tokenCache.set(cacheKey, existingInstallationData);
    }


    if (
      existingInstallationData.rateLimit &&
      existingInstallationData.installationId
    ) {
      this.rateLimits.set(
        existingInstallationData.installationId.toString(),
        existingInstallationData.rateLimit.remaining,
      );
    }

    if (!this.appliesToRepo(existingInstallationData, repo)) {
      throw new Error(
        `The Backstage GitHub application used in the ${owner} organization does not have access to a repository with the name ${repo}`,
      );
    }

    return { accessToken: existingInstallationData.token, installationId: existingInstallationData.installationId, rateLimit: existingInstallationData.rateLimit };
  }

  private isExpired = (date: DateTime) => DateTime.local() > date;
  private isTooOld = (date: DateTime) => DateTime.local().diff(date, 'minutes').minutes > 2;

  private appliesToRepo(tokenData: InstallationTokenData, repo?: string) {
    // If no specific repo has been requested the token is applicable
    if (repo === undefined) {
      return true;
    }
    // If the token is restricted to repositories, the token only applies if the repo is in the allow list
    if (tokenData.repositories !== undefined) {
      return tokenData.repositories.includes(repo);
    }
    // Otherwise the token is applicable
    return true;
  }
}

/**
 * This accept header is required when calling App APIs in GitHub Enterprise.
 * It has no effect on calls to github.com and can probably be removed entirely
 * once GitHub Apps is out of preview.
 */
const HEADERS = {
  Accept: 'application/vnd.github.machine-man-preview+json',
};

/**
 * GithubAppManager issues and caches tokens for a specific GitHub App.
 */
class GithubAppManager {
  private readonly appClient: Octokit;
  private readonly baseUrl?: string;
  private readonly baseAuthConfig: { appId: number; privateKey: string };
  private static cache: Cache;
  private readonly allowedInstallationOwners: string[] | undefined; // undefined allows all installations
  public readonly appId: number;
  constructor(config: GithubAppConfig, private readonly logger: winston.Logger, baseUrl?: string) {
    this.allowedInstallationOwners = config.allowedInstallationOwners;
    this.baseUrl = baseUrl;
    this.appId = config.appId;
    this.baseAuthConfig = {
      appId: config.appId,
      privateKey: config.privateKey.replace(/\\n/gm, '\n'),
    };
    this.appClient = new Octokit({
      baseUrl,
      headers: HEADERS,
      authStrategy: createAppAuth,
      auth: this.baseAuthConfig,
    });
    if (!GithubAppManager.cache) {
      GithubAppManager.cache = new Cache(logger, baseUrl ?? GITHUB_API_BASE_URL);
    }
  }

  async getInstallationCredentials(
    appId: number,
    owner: string,
    repo?: string,
  ): Promise<{
    accessToken: string | undefined,
    installationId?: number,
    rateLimit?: {
      limit: number;
      remaining: number;
      reset: number;
      used: number;
    }
  }> {
    if (this.allowedInstallationOwners) {
      if (!this.allowedInstallationOwners?.includes(owner)) {
        return { accessToken: undefined }; // An empty token allows anonymous access to public repos
      }
    }

    // Go and grab an access token for the app scoped to a repository if provided, if not use the organisation installation.
    return GithubAppManager.cache.getOrCreateToken(appId, owner, repo, async () => {
      const { installationId, suspended } = await this.getInstallationData(
        owner,
      );
      if (suspended) {
        throw new Error(`The GitHub application for ${owner} is suspended`);
      }

      const result = await this.appClient.apps.createInstallationAccessToken({
        installation_id: installationId,
        headers: HEADERS,
      });

      let repositoryNames;

      const installationClient = new Octokit({
        baseUrl: this.baseUrl,
        auth: result.data.token,
      });
      if (result.data.repository_selection === 'selected') {
        const repos = await installationClient.paginate(
          // @ts-ignore
          installationClient.apps.listReposAccessibleToInstallation,
        );
        // The return type of the paginate method is incorrect.
        const repositories: RestEndpointMethodTypes['apps']['listReposAccessibleToInstallation']['response']['data']['repositories'] =
          // @ts-ignore
          repos.repositories ?? repos;
        repositoryNames = repositories.map(repository => repository.name);
      }

      let rateLimit: {
        limit: number;
        remaining: number;
        reset: number;
        used: number;
        fetchedAt: DateTime;
      } | undefined;

      if (
        result.headers['x-ratelimit-limit'] &&
        result.headers['x-ratelimit-remaining'] &&
        result.headers['x-ratelimit-reset'] &&
        result.headers['x-ratelimit-used']
      ) {
        rateLimit = {
          limit: parseInt(result.headers['x-ratelimit-limit'], 10),
          remaining: parseInt(result.headers['x-ratelimit-remaining'], 10),
          reset: parseInt(result.headers['x-ratelimit-reset'], 10),
          used: parseInt(result.headers['x-ratelimit-used'] as string, 10),
          fetchedAt: DateTime.local(),
        }

        this.logger.debug(`supplier rate limit for installation ${installationId} is ${JSON.stringify(rateLimit)}`);
      }
      return {
        token: result.data.token,
        installationId,
        expiresAt: DateTime.fromISO(result.data.expires_at),
        repositories: repositoryNames,
        rateLimit
      };
    });
  }

  getInstallations(): Promise<
    RestEndpointMethodTypes['apps']['listInstallations']['response']['data']
  > {
    // @ts-ignore
    return this.appClient.paginate(this.appClient.apps.listInstallations);
  }

  private async getInstallationData(owner: string): Promise<InstallationData> {
    const allInstallations = await this.getInstallations();
    const installation = allInstallations.find(
      inst =>
        inst.account &&
        'login' in inst.account &&
        inst.account.login?.toLocaleLowerCase('en-US') ===
        owner.toLocaleLowerCase('en-US'),
    );
    if (installation) {
      return {
        installationId: installation.id,
        suspended: Boolean(installation.suspended_by),
      };
    }
    const notFoundError = new Error(
      `No app installation found for ${owner} in ${this.baseAuthConfig.appId}`,
    );
    notFoundError.name = 'NotFoundError';
    throw notFoundError;
  }
}

/**
 * Corresponds to a Github installation which internally could hold several GitHub Apps.
 *
 * @public
 */
export class GithubAppCredentialsMux {
  private readonly apps: GithubAppManager[];

  constructor(config: GithubIntegrationConfig, private readonly logger: winston.Logger) {
    this.apps =
      config.apps?.map(ac => new GithubAppManager(ac, logger, config.apiBaseUrl)) ?? [];
  }

  async getAllInstallations(): Promise<
    RestEndpointMethodTypes['apps']['listInstallations']['response']['data']
  > {
    if (!this.apps.length) {
      return [];
    }

    const installs = await Promise.all(
      this.apps.map(app => app.getInstallations()),
    );

    return installs.flat();
  }

  async getAppToken(owner: string, repo?: string): Promise<string | undefined> {
    if (this.apps.length === 0) {
      return undefined;
    }

    const results = await Promise.all(
      this.apps.map(app =>
        app.getInstallationCredentials(app.appId, owner, repo).then(
          info => ({ accessToken: info.accessToken, installationId: info.installationId, rateLimit: info.rateLimit, error: undefined }),
          error => ({ accessToken: undefined, installationId: undefined, rateLimit: undefined, error }),
        ),
      ),
    );

    this.logger.debug(`githubAppCredentialsMux.getAppToken has ${results.length} apps available`);

    // always get the token who contains more rate limit available
    const result = results
      .filter(resultItem => resultItem.accessToken)
      .sort((a, b) => b.rateLimit!.remaining - a.rateLimit!.remaining)[0];

    this.logger.debug(`githubAppCredentialsMux.getAppToken using app with rate limit ${result?.rateLimit?.remaining}`);

    if (result && result.rateLimit && result.rateLimit?.remaining <= 0) {
      // Wait for the rate limit to reset on last lap
      const resetTime = DateTime.fromSeconds(result.rateLimit.reset);
      const waitTime = resetTime.diffNow().milliseconds;
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return result.accessToken;
    }

    if (result) {
      return result.accessToken;
    }

    const errors = results.map(r => r.error);
    const notNotFoundError = errors.find(err => err?.name !== 'NotFoundError');
    if (notNotFoundError) {
      throw notNotFoundError;
    }

    return undefined;
  }
}

/**
 * Handles the creation and caching of credentials for GitHub integrations.
 *
 * @public
 * @remarks
 *
 * TODO: Possibly move this to a backend only package so that it's not used in the frontend by mistake
 */
class SingleInstanceGithubCredentialsProvider
  implements GithubCredentialsProvider {
  static create: (
    config: GithubIntegrationConfig,
  ) => GithubCredentialsProvider = config => {
    return new SingleInstanceGithubCredentialsProvider(
      new GithubAppCredentialsMux(config, getRootLogger().child({ 'service': 'github-credentials-provider' })),
      config.token,
    );
  };

  private constructor(
    private readonly githubAppCredentialsMux: GithubAppCredentialsMux,
    private readonly token?: string,
  ) { }

  /**
   * Returns {@link GithubCredentials} for a given URL.
   *
   * @remarks
   *
   * Consecutive calls to this method with the same URL will return cached
   * credentials.
   *
   * The shortest lifetime for a token returned is 10 minutes.
   *
   * @example
   * ```ts
   * const { token, headers } = await getCredentials({
   *   url: 'github.com/backstage/foobar'
   * })
   * ```
   *
   * @param opts - The organization or repository URL
   * @returns A promise of {@link GithubCredentials}.
   */
  async getCredentials(opts: { url: string }): Promise<GithubCredentials> {
    const parsed = parseGitUrl(opts.url);

    const owner = parsed.owner || parsed.name;
    const repo = parsed.owner ? parsed.name : undefined;

    let type: GithubCredentialType = 'app';
    let token = await this.githubAppCredentialsMux.getAppToken(owner, repo);
    if (!token) {
      type = 'token';
      token = this.token;
    }

    return {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      token,
      type,
    };
  }
}

export class PicPayGithubCredentialsProvider
  implements GithubCredentialsProvider {
  static fromIntegrations(integrations: ScmIntegrationRegistry) {
    const credentialsProviders: Map<string, GithubCredentialsProvider> =
      new Map<string, GithubCredentialsProvider>();

    integrations.github.list().forEach(integration => {
      const credentialsProvider =
        SingleInstanceGithubCredentialsProvider.create(integration.config);
      credentialsProviders.set(integration.config.host, credentialsProvider);
    });
    return new PicPayGithubCredentialsProvider(credentialsProviders);
  }

  private constructor(
    private readonly providers: Map<string, GithubCredentialsProvider>,
  ) { }

  /**
   * Returns {@link GithubCredentials} for a given URL.
   *
   * @remarks
   *
   * Consecutive calls to this method with the same URL will return cached
   * credentials.
   *
   * The shortest lifetime for a token returned is 10 minutes.
   *
   * @example
   * ```ts
   * const { token, headers } = await getCredentials({
   *   url: 'https://github.com/backstage/foobar'
   * })
   *
   * const { token, headers } = await getCredentials({
   *   url: 'https://github.com/backstage'
   * })
   * ```
   *
   * @param opts - The organization or repository URL
   * @returns A promise of {@link GithubCredentials}.
   */
  async getCredentials(opts: { url: string }): Promise<GithubCredentials> {
    const parsed = new URL(opts.url);
    const provider = this.providers.get(parsed.host);

    if (!provider) {
      throw new Error(
        `There is no GitHub integration that matches ${opts.url}. Please add a configuration for an integration.`,
      );
    }

    return provider.getCredentials(opts);
  }
}