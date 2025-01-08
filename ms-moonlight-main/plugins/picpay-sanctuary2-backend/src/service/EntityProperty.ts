import {
  CatalogApi,
  CatalogClient,
  GetEntitiesRequest,
} from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { Status } from '../model/Enums';
import { Logger } from 'winston';

type IEntityProperty = {
  getOwner(componentId: string, componentKind: string, componentName?: string): Promise<{ owner: string; group: string }>;
  getMembersGroup(owner: string): Promise<string[]>;
  getRequesterEntity(entityRef: string, entityNamespace: string): Promise<Entity | undefined>;
  getReviewersByGroup(
    owner: string,
  ): Promise<{ githubProfile: string; email: string }[]>;
};

type Options = {
  catalog: CatalogApi | CatalogClient;
  logger: Logger;
};

export class EntityProperty implements IEntityProperty {
  private catalog: CatalogApi | CatalogClient;
  private logger: Logger;
  private _token: string | undefined;

  constructor(options: Options) {
    this.logger = options.logger;
    this.catalog = options.catalog;
  }

  set token(authorizationToken: string | undefined) {
    this._token = authorizationToken;
  }

  get token() {
    return this._token;
  }

  private async getEntities(
    fields: string[],
    filter: GetEntitiesRequest['filter'],
  ): Promise<any[]> {
    try {
      const { items } = await this.catalog.getEntities(
        {
          fields: fields,
          filter: filter,
        },
        // {
        //   token: this.token,
        // },
      );

      return items;
    } catch (error) {
      this.logger.error('Sanctuary2-backend Error getting entities ', error);
      throw error;
    }
  }

  async hasEntity(componentId: string): Promise<boolean> {
    const entity: any[] = await this.getEntities(['relations'], {
      kind: 'component',
      'metadata.uid': componentId,
    });

    return entity.length ? true : false;
  }

  async getOwner(
    componentId: string,
    componentKind: string,
    componentName?: string,
  ): Promise<{ owner: string; group: string }> {
    try {
      const metadataName = componentName ? { 'metadata.name': componentName } : '';
      const items: any[] = await this.getEntities(['relations'], {
        'kind': componentKind,
        'metadata.uid': componentId,
        ...metadataName,
      });

      let group = '';
      let owner = '';
      items.forEach(key => {
        key.relations.forEach(
          (keys: {
            type: string;
            target: { name: string };
            targetRef: string;
          }) => {
            if (keys.type === 'ownedBy') {
              owner = keys.target.name;
              group = keys.targetRef;
              return;
            }
          },
        );
      });

      return {
        group: group,
        owner: owner,
      };
    } catch (error) {
      throw new Error(Status.FAILED_GET_OWNER);
    }
  }

  async getRequesterEntity(entityRef: string, entityNamespace: string): Promise<Entity | undefined> {
    return await this.catalog.getEntityByRef({
      'kind': 'User',
      'namespace': entityNamespace,
      'name': entityRef,
    });
  }

  async getMembersGroup(owner: string): Promise<string[]> {
    const items: any[] = await this.getEntities(['metadata.name'], {
      kind: 'user',
      'relations.memberof': owner,
    });

    return items.map((member: { metadata: { name: any } }) => {
      // @ts-ignore
      return member.spec?.github?.login ?? member.metadata.name;
    });
  }

  async getReviewersByGroup(
    owner: string,
  ): Promise<{ githubProfile: string; email: string }[] | []> {
    try {
      const items: any[] = await this.getEntities(
        ['metadata.name', 'spec.github', 'spec.profile.email', 'spec.profile.displayName'],
        {
          kind: 'User',
          'relations.memberof': owner,
        },
      );

      if (items.length === 0) {
        return [];
      }

      return items
        .filter(member => member.spec?.profile?.email)
        .map(
          (member: {
            metadata: { name: any };
            spec?: { github?: { login: string }, profile?: { email: string; displayName: string } };
          }) => {
            return {
              githubProfile: member.spec?.github?.login ?? member.metadata.name,
              email: member?.spec?.profile?.email ?? '',
            };
          },
        );
    } catch (error) {
      throw new Error(Status.FAILED_GET_REVIEWERS);
    }
  }
}
