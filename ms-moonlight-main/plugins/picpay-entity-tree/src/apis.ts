import { Entity } from '@backstage/catalog-model';
import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export type EntityWithParents = {
  name: string;
  kind: string;
  namespace?: string;
  type?: string;
  parents: EntityWithParents[];
};

export const getBusinessUnit = async (parent: EntityWithParents): Promise<string> => {
  if (parent.type === 'business-unit') {
    return parent.name;
  }

  for (const p of parent.parents) {
    try {
      return await getBusinessUnit(p);
    } catch (e) {
      continue;
    }
  }

  return Promise.reject();
};

export type EntityTreeApi = {
  getParents(name: string, namespace?: string, kind?: string): Promise<EntityWithParents>;
  getBUNameByEntity(entity: Entity): Promise<string>;
};

export const entityTreeApiRef = createApiRef<EntityTreeApi>({
  id: 'entity-tree-api',
});

export class EntityTreeApiClient implements EntityTreeApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  public async getParents(
    name: string,
    namespace?: string,
    kind?: string,
  ): Promise<EntityWithParents> {
    const { token } = await this.identityApi.getCredentials();

    const response = await fetch(
      `${this.configApi.getString(
        'backend.baseUrl',
      )}/api/catalog/entities/${namespace}/${kind}/${name}/parents`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      },
    );

    return await response.json();
  }

  public async getBUNameByEntity(
    entity: Entity,
  ): Promise<string> {
    const parent = await this.getParents(
      entity.metadata.name,
      entity.metadata.namespace ?? 'default',
      entity.kind ?? undefined,
    );

    return getBusinessUnit(parent);
  }
}
