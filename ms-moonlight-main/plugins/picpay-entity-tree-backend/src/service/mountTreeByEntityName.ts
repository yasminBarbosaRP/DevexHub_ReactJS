import { CatalogApi } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';

interface RelationType {
  type: string;
  target: {
    name: string;
    namespace: string;
    kind: string;
  };
}

type EntityWithParents = {
  name: string;
  description?: string;
  kind: string;
  namespace?: string;
  type?: string;
  owner?: string;
  language?: string;
  framework?: string;
  tags?: string[];
  lifecycle?: string;
  clusterPrd?: string;
  clusterHom?: string;
  parents: EntityWithParents[];
};

const mountTreeByEntityName = async (
  catalog: CatalogApi,
  name: string,
  namespace: string,
  kind?: string,
  ignore?: string[],
  cache: Map<string, EntityWithParents> = new Map(),
): Promise<EntityWithParents | null | undefined> => {
  if (!name) {
    return null;
  }
  const ignoreParents = ignore ?? [];

  const cacheKey = `${name}:${namespace ?? 'default'}`;
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey)!;
  }

  let entity: Entity | undefined;

  if (kind) {
    entity = await catalog.getEntityByRef({
      name,
      kind,
      namespace: namespace ?? 'default',
    });
  } else {
    const { items: entities } = await catalog.getEntities({
      filter: {
        'metadata.name': name,
        'metadata.namespace': namespace ? namespace : 'default',
      },
      limit: 1,
    });
    entity = entities[0];
  }

  if (!entity) {
    return null;
  }

  const result: EntityWithParents = {
    name: entity.metadata.name,
    description: entity.metadata?.description,
    kind: entity.kind,
    namespace: entity.metadata.namespace,
    type: entity.spec?.type as string,
    owner: entity.spec?.owner as string,
    framework: entity.metadata?.labels?.['moonlight.picpay/framework'] as string,
    language: entity.metadata?.labels?.['moonlight.picpay/language'] as string,
    lifecycle: entity.spec?.lifecycle as string,
    clusterHom: entity.metadata?.annotations?.['moonlight.picpay/cluster-hom'],
    clusterPrd: entity.metadata?.annotations?.['moonlight.picpay/cluster-prd'],
    tags: entity.metadata?.tags,
    parents: [],
  };

  const relations = ((entity?.relations as any) ?? []) as RelationType[];

  await Promise.all(
    relations
      .filter(relation => ['ownedBy', 'childOf'].includes(relation.type))
      .map(async relation => {
        const ref = `${relation?.target?.name}:${relation?.target?.namespace ?? 'default'
          }:${relation?.target?.kind}`;
        if (!ignoreParents.includes(ref)) {
          ignoreParents.push(ref);

          const parent = await mountTreeByEntityName(
            catalog,
            relation?.target?.name,
            relation?.target?.namespace,
            relation?.target?.kind,
            ignoreParents,
            cache,
          );

          if (parent) {
            result.parents.push(parent);
          }
        }
      }),
  );

  cache.set(cacheKey, result);

  return result;
};

export default mountTreeByEntityName;
