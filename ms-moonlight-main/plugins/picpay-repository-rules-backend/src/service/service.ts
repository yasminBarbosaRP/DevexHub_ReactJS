import { CatalogApi } from '@backstage/catalog-client';
import { DEFAULT_NAMESPACE } from "@backstage/catalog-model";

export const repositoryOwner = async (
  catalog: CatalogApi,
  repo: string,
): Promise<string|undefined> => {

  const { items: entities } = await catalog.getEntities({
    filter: {
      'kind': 'Component',
      'metadata.name': repo,
    },
    fields: ['spec'],
    limit: 1,
  });

  const owner = entities[0]?.spec?.owner
  if (owner === undefined) {
    return undefined;
  }

  return owner?.toString();
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

export const hasNonDefaultNamespaceParents = (data?: EntityWithParents | null | undefined): boolean => {
  if (!data) {
    return false;
  }

  const traverse = (entity: EntityWithParents): boolean => {
    if (entity.namespace !== DEFAULT_NAMESPACE) {
      return true;
    }

    return entity.parents.some(traverse);
  };

  return data.parents.some(traverse);
};

export const validateDate = (v: Date): boolean => {
  const currentDate = new Date()
  const currentDateOnly = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate());

  return currentDateOnly > v;
}
