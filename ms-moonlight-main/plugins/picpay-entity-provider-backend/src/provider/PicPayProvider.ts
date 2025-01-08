import { Logger } from 'winston';
import { Entity } from '@backstage/catalog-model';
import { Database } from '../database/Database';
import { mergeWith, isArray, isPlainObject } from 'lodash';
import { EntityRef } from './Record';
import { WebClient } from '@slack/web-api';
import { PluginCacheManager } from '@backstage/backend-common';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Config } from '@backstage/config';
import { Octokit } from 'octokit';
import { githubConnection, GithubRepository } from '@internal/plugin-picpay-core-components';
import { AdditionalInformation, Members } from '../database/tables';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';
import { withActiveSpan, TRACER_ID } from '../utils/opentelemetry';
import { SpanStatusCode, trace } from '@opentelemetry/api';
import nunjucks from 'nunjucks';

const tracer = trace.getTracer(TRACER_ID);

const DAYS_SLACK = Number(process.env.SLACK_CACHE_DAYS ?? 365);
const TTL_SLACK = (1000 * 60 * 60 * 24 * DAYS_SLACK);
const TTL_GITHUB = (1000 * 60 * 60 * 24);
const TTL_GITHUB_BLOCKED = (1000 * 60 * 60 * 12);

export const ANNOTATIONS_BASE = {
  'backstage.io/managed-by-location': 'ad://picpay-entity-provider',
  'backstage.io/managed-by-origin-location': 'ad://picpay-entity-provider',
  'backstage.io/source-location': 'ad://picpay-entity-provider',
};

export interface SlackInformation {
  slackId?: string;
  picture?: string;
}

export interface GithubData {
  login: string;
  avatar: string;
  teams: string[];
}

type Cache = { ref: EntityRef, members: Members[] };

const SLACK_USER_LOOKUP_DISABLED = process.env.SLACK_USER_LOOKUP_DISABLED === 'true';

export class PicPayProvider {
  private entityRefCache: Map<string, Cache[]> = new Map();
  private additionalInformationMap: Map<string, AdditionalInformation[]> = new Map();
  private membersMap: Map<string, Members[]> = new Map();
  protected readonly njucks = nunjucks.configure({
    throwOnUndefined: false,
    autoescape: false,
  });

  protected constructor(
    protected readonly logger: Logger,
    protected readonly database: Database,
    protected readonly cache: PluginCacheManager,
    protected readonly config?: Config,
    protected readonly slackApi?: WebClient,
  ) { }

  protected async clearCache() {
    return await withActiveSpan(tracer, 'clearCache', async span => {
      this.logger.info('Cleaning entity provider cache');
      span.setAttribute('cache_size', this.entityRefCache.size);
      this.entityRefCache.clear();
      this.logger.info('Entity provider cache cleaned');
    });
  }

  protected async preloadAdditionalInformation() {
    const allAdditionalInfo = await this.database
      .additionalInformationRepository()
      .getAll();

    for (const info of allAdditionalInfo ?? []) {
      if (!this.additionalInformationMap.has(info.entityRef)) {
        this.additionalInformationMap.set(info.entityRef, []);
      }
      this.additionalInformationMap.get(info.entityRef)?.push(info);
    }

    const allMembers = await this.database.members().getAll();

    for (const member of allMembers ?? []) {
      if (!this.membersMap.has(member.additionalInformationId)) {
        this.membersMap.set(member.additionalInformationId, []);
      }
      this.membersMap.get(member.additionalInformationId)?.push(member);
    }
  }

  protected async realEntityRef(
    entityRef: EntityRef,
    query: (members: Members[]) => boolean = () => true
  ): Promise<EntityRef[] | undefined> {
    return await withActiveSpan(tracer, 'realEntityRef', async span => {
      span.setAttribute('entityRef', entityRef.toString());

      if (!entityRef || !entityRef.isValid()) {
        span.setAttribute('entity_ref_is_valid', false);
        return undefined;
      }
      span.setAttribute('entity_ref_is_valid', true);

      if (this.entityRefCache.has(entityRef.toString())) {
        span.setAttribute('cached', true);
        const cache = this.entityRefCache.get(entityRef.toString());
        return cache
          ?.filter(c => query(c.members ?? []))
          .map(c => c.ref);
      }
      span.setAttribute('cached', false);

      const additionalInformation = this.additionalInformationMap.get(entityRef.toString()) || [];

      const newCache: Cache[] = [];
      const result = [];
      if (additionalInformation.length === 0) {
        const real = new EntityRef({
          type: entityRef.type!,
          namespace: entityRef.namespace ?? "default",
          name: entityRef.name ?? "unknown",
        });

        newCache.push({ ref: real, members: [] });
        result.push(real);
      }

      for (const info of additionalInformation) {
        const members = this.membersMap.get(info.id) || [];

        const real = new EntityRef({
          type: entityRef.type!,
          namespace: info.content?.metadata.namespace ?? entityRef.namespace ?? "default",
          name: info.content?.metadata.name ?? "unknown",
        });

        newCache.push({ ref: real, members });
        if (!query(members)) continue;
        result.push(real);
      }
      this.entityRefCache.set(entityRef.toString(), newCache);
      return result;
    })
  }

  protected async additionalInformation(
    entityRef: EntityRef,
    entity: Entity
  ): Promise<Entity[]> {
    return await withActiveSpan(tracer, 'additionalInformation', async span => {

      const additionalInformation = await this.database
        .additionalInformationRepository()
        .get(entityRef.toString(), false);

      span.setAttribute('in_database', additionalInformation.length > 0);
      if (!additionalInformation || additionalInformation.length === 0) {
        entity.metadata.annotations = {
          ...(entity.metadata.annotations ?? {}),
          'moonlight.picpay/unnamed-group': 'true',
        };
        return [entity];
      }

      const result = []
      for (const info of additionalInformation) {
        const mergedEntity = mergeWith(
          {},
          entity,
          info?.content,
          (objValue: any, srcValue: any) => {
            if (isArray(objValue)) {
              return objValue.concat(srcValue);
            }
            if (isPlainObject(objValue)) {
              return mergeWith({}, objValue, srcValue, (o, s) => {
                if (isArray(o)) {
                  return o.concat(s);
                }
                return undefined;
              });
            }
            return objValue === undefined ? srcValue : objValue;
          }
        );

        mergedEntity.metadata.annotations = {
          ...(mergedEntity.metadata.annotations ?? {}),
          'moonlight.picpay/managed-by-id': info.id.toString(),
        };

        result.push(mergedEntity);
      }
      return result;
    });
  }

  private async connectionGithub(): Promise<Octokit | undefined> {
    if (!this.config) {
      return undefined;
    }

    const integrations = ScmIntegrations.fromConfig(this.config);
    const githubCredentialsProvider: GithubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);

    const conn = await githubConnection(
      '',
      integrations,
      githubCredentialsProvider,
    );

    return conn;
  }

  protected async loadGithubUsersInformation(): Promise<void> {
    return await withActiveSpan(tracer, 'loadGithubUsersInformation', async span => {
      const client = this.cache.getClient({ defaultTtl: TTL_GITHUB });
      const blocked = await client.get('github:blocked');

      span.setAttribute('blocked', !!blocked);
      if (blocked) {
        this.logger.debug('Github information already loaded');
        return;
      }

      const query = `
      query ($after: String){
        organization(login: "PicPay") {
          membersWithRole(first: 100 after: $after) {
            pageInfo {
              hasNextPage
              hasPreviousPage
              startCursor
              endCursor
            }
            totalCount
            nodes {
              ... on User {
                login
                email
                avatarUrl
                organizationVerifiedDomainEmails(login: "PicPay")
              }
            }
          }
        }
      }
    `;

      const connectionGithub = await this.connectionGithub();

      if (!connectionGithub) {
        this.logger.error('Invalid Token Github');
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid Token Github' });
        return;
      }
      const github = new GithubRepository(connectionGithub);

      let teamPage = 1;
      const teamCache = new Map<string, string[]>();
      while (teamPage > 0) {
        const teams = await github.getTeams("PicPay", teamPage);
        if (teams.length === 0) {
          break;
        }

        await Promise.all(teams.map(async (team: any) => {
          let memberPage = 1;
          while (memberPage > 0) {
            const members = await github.getTeamMembers("PicPay", team.slug, memberPage);
            if (members.length === 0) break;

            for (const member of members) {
              this.logger.debug(`adding ${member.login} team ${team.slug} to cache`);
              teamCache.set(member.login, [...(teamCache.get(member.login) ?? []), team.slug]);
            }

            memberPage++;
          }
        }));
        teamPage++;
      }

      let usergroupsResponse: any;
      do {
        this.logger.debug('paginating users on github');

        const variables = {
          after: usergroupsResponse?.data?.data?.organization?.membersWithRole?.pageInfo?.endCursor || null
        };
        usergroupsResponse = await github.runQuery(query, variables);

        for (const node of usergroupsResponse.data.data.organization.membersWithRole.nodes) {
          const email = node.organizationVerifiedDomainEmails?.[0] || node.email;

          if (!email) {
            this.logger.debug(`User ${node.login} has no email`);
            continue;
          }

          const content = {
            login: node.login,
            teams: teamCache.get(node.login) ?? [],
            avatar: node.avatarUrl,
          }
          await client.set(`github:${email}`, content);
        }
      } while (usergroupsResponse.data.data.organization.membersWithRole.pageInfo.hasNextPage);

      await client.set('github:blocked', true, { ttl: TTL_GITHUB_BLOCKED });
    })
  }

  protected async getGitHubUser(email: string): Promise<GithubData | undefined> {
    return await withActiveSpan(tracer, 'getGithubUser', async _span => {

      const client = this.cache.getClient({ defaultTtl: TTL_GITHUB });
      const cacheKey = `github:${email}`;
      const cache = await client.get(cacheKey);

      if (cache) {
        return cache as unknown as GithubData;
      }

      return undefined;
    })
  }

  protected async getSlackInformation(
    email: string
  ): Promise<SlackInformation | undefined> {
    return await withActiveSpan(tracer, 'loadGithubUsersInformation', async span => {

      const client = this.cache.getClient({ defaultTtl: TTL_SLACK });
      const cacheKey = `slack:${email}`;
      const cache = await client.get(cacheKey);

      if (cache) {
        return cache as SlackInformation;
      }

      if (!this.slackApi || SLACK_USER_LOOKUP_DISABLED) {
        return undefined;
      }

      try {
        const resp = await this.slackApi.users.lookupByEmail({
          email,
        });
        const content = {
          slackId: resp.user?.id,
          picture: resp.user?.profile?.image_192,
        };

        await client.set(cacheKey, content);

        return content;
      } catch (err) {
        span.setStatus({ code: SpanStatusCode.ERROR, message: 'Error fetching user picture' });
        this.logger.debug('Error fetching user picture');
      }

      return undefined;
    })
  }
}
