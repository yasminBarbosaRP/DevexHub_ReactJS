import { Entity, parseEntityRef } from '@backstage/catalog-model';
import { LocationSpec } from '@backstage/plugin-catalog-common';
import { CatalogProcessorEmit } from '@backstage/plugin-catalog-node';
import * as winston from 'winston';
import { EntityProcessorIntermediator } from '@internal/plugin-picpay-custom-entity-processor-backend';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { ConfigApi } from '@backstage/core-plugin-api';
import * as parser from 'uri-template';
import { QueryEntitiesResponse } from '@backstage/catalog-client';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';

const sourceLocationRegex = /PicPay\/(.*?)\/tree/;

const ANNOTATION_KEY = {
  REPOSITORY_ID_KEY: 'github.com/repository-id',
  BRANCH_PROTECTION_REQUIRE_CODE_OWNER_REVIEWS_KEY: 'github.com/branch-protection-require-code-owner-reviews',
  REPOSITORY_CREATED_AT_KEY: 'github.com/repository-created-at',
  BRANCH_PROTECTION_REQUIRED_APPROVALS: 'github.com/branch-protection-required-approvals',
  PROJECT_SLUG: 'github.com/project-slug',
  BRANCH_PROTECTION_RULES: 'github.com/branch-protection-rules',
}

const mountEntityRef = (entity: Entity) => {
  const entityRef = parseEntityRef(entity.metadata.name, {
    defaultKind: entity.kind,
    defaultNamespace: entity.metadata.namespace,
  });

  return `${entityRef.kind}:${entityRef.namespace}/${entityRef.name}`;
};

export class GithubAnnotationIntermediator
  implements EntityProcessorIntermediator {
  private _ignoredEntity: Map<string, { [key: string]: string }> = new Map();

  constructor(
    private readonly logger: winston.Logger,
    private readonly config: ConfigApi,
    private readonly backendUrl: string,
  ) { }

  static async init(
    logger: winston.Logger,
    config: ConfigApi,
  ): Promise<EntityProcessorIntermediator> {

    return new GithubAnnotationIntermediator(logger, config, config.getString('backend.baseUrl'));
  }

  private async ignoredEntity() {
    if (this._ignoredEntity.size === 0) {
      try {

        const uriTemplate = `/entities/by-query{?fields,filter*}`;

        const uri = parser.parse(uriTemplate).expand({
          filter: [
            { kind: 'Component' },
            { kind: 'Resource' },
            { kind: 'Template' },
            { kind: 'API' },
            { kind: 'System' },
            { kind: 'Domain' },
          ],
          fields: [
            'kind',
            'metadata.name',
            'metadata.namespace',
            'metadata.annotations',
          ],
        });

        const result = await fetch(
          `${this.backendUrl}/api/catalog/${uri}`,
          {
            headers: {
              'x-application-name': 'ms-moonlight'
            }
          }
        );
        if (!result || !result.ok) {
          throw new Error(`unable to fetch entities from catalog`);
        }

        const entities: QueryEntitiesResponse = await result.json()
        const requiredKeys = Object.values(ANNOTATION_KEY);
        for (const entity of entities.items) {
          const missingAnnotations = requiredKeys.filter(key => !(key in (entity.metadata?.annotations ?? {})));

          if (missingAnnotations.length === 0) {
            continue;
          }

          this._ignoredEntity.set(mountEntityRef(entity), this.getEntityGithubAnnotations(entity));
        }
      } catch (error) {
        this.logger.debug(
          `error while trying to get entities with github annotations: ${error}`
        );
      }
    }

    return this._ignoredEntity ?? [];
  }

  private addIgnoredEntity(entityRef: string, annotations: { [key: string]: string }) {
    this._ignoredEntity.set(entityRef, annotations);
  }

  private async clientOctokit(repoName: String): Promise<Octokit> {
    const integrations = ScmIntegrations.fromConfig(this.config);
    const githubCredentialsProvider: GithubCredentialsProvider =
      PicPayGithubCredentialsProvider.fromIntegrations(integrations);

    const credentialProviderToken =
      await githubCredentialsProvider?.getCredentials({
        url: `https://github.com/PicPay/${repoName}`,
      });

    return new Octokit({
      ...integrations,
      baseUrl: 'https://api.github.com',
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
      auth: credentialProviderToken?.token,
      previews: ['nebula-preview'],
    });
  }

  getName(): string {
    return 'github-annotation-intermediator';
  }

  async postHandle(
    entity: Entity,
    _location: LocationSpec,
    _emit: CatalogProcessorEmit
  ): Promise<void> {
    if (process.env.GITHUB_ANNOTATION_INTERMEDIATOR_DISABLED === 'true') {
      return;
    }

    const entityRef = mountEntityRef(entity);

    const previousEntityAnnotations = (await this.ignoredEntity()).get(entityRef);
    if (previousEntityAnnotations) {
      this.logger.debug(`entity ${entityRef} already has github annotations`);
      entity.metadata.annotations = {
        ...entity.metadata.annotations,
        ...previousEntityAnnotations,
      };

      return;
    }

    const annotations = entity?.metadata?.annotations || {};

    try {
      const [org, repo] = this.getOrganizationAndRepository(annotations);
      if (!org || !repo) {
        this.logger.debug(
          `invalid github.com/project-slug annotation found for entity ${entity.metadata.name}`
        );
        return;
      }

      const octokit = await this.clientOctokit(entity.metadata.name);

      const graphQLData: any = await octokit.graphql(`
        query GetRepoDetails($owner: String!, $repo: String!) {
          repository(owner: $owner, name: $repo) {
            databaseId
            createdAt
            defaultBranchRef { name }
            branchProtectionRules(first: 10) {
              edges {
                node {
                  requiredApprovingReviewCount
                  requiresCodeOwnerReviews
                  pattern
                }
              }
            }
          }
        }
      `, {
        owner: org,
        repo: repo,
      });

      const defaultBranch = graphQLData?.repository?.defaultBranchRef?.name;
      const protectionRule = graphQLData?.repository?.branchProtectionRules?.edges.find((rule: any) =>
        rule.node.pattern === defaultBranch
      );

      const githubAnnotations = {
        [ANNOTATION_KEY.REPOSITORY_ID_KEY]: graphQLData?.repository?.databaseId?.toString(),
        [ANNOTATION_KEY.REPOSITORY_CREATED_AT_KEY]: graphQLData?.repository?.createdAt,
        [ANNOTATION_KEY.PROJECT_SLUG]: `${org}/${repo}`,
        [ANNOTATION_KEY.BRANCH_PROTECTION_REQUIRED_APPROVALS]: protectionRule?.node?.requiredApprovingReviewCount || 0,
        [ANNOTATION_KEY.BRANCH_PROTECTION_REQUIRE_CODE_OWNER_REVIEWS_KEY]: protectionRule?.node?.requiresCodeOwnerReviews || false,
        [ANNOTATION_KEY.BRANCH_PROTECTION_RULES]: !!protectionRule,
      };

      entity.metadata.annotations = {
        ...annotations,
        ...githubAnnotations,
      };

      this.addIgnoredEntity(entityRef, githubAnnotations);
    } catch (err) {
      this.logger.error(
        `error while trying to annotate entity ${entity.metadata.name} with github data: ${err}`
      );
    }
  }

  private getOrganizationAndRepository(annotations: {
    [key: string]: string;
  }): [string | undefined, string | undefined] {
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

    if (annotations['github.com/project-slug']) {
      const [org, repo] = annotations['github.com/project-slug'].split('/');

      if (org && repo) {
        return [org, repo];
      }
    }

    return [undefined, undefined];
  }

  private getEntityGithubAnnotations(entity: Entity): {
    [key: string]: string;
  } {
    const annotations: { [key: string]: string } = {};
    for (const annotation of Object.keys(entity?.metadata?.annotations ?? {})) {
      if (annotation.startsWith('github.com/')) {
        annotations[annotation] = entity?.metadata?.annotations?.[annotation] ?? '';
      }
    }
    return annotations;
  }
}
