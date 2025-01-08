import { CompoundEntityRef, DEFAULT_NAMESPACE } from "@backstage/catalog-model";

export const parseEntityRefWithDefaults = (
  entityRef: string,
  defaults: {
    kind: string,
    namespace: string
  }
): CompoundEntityRef => {
  const regex = /^(?:(?<kind>[^:]+):)?(?:(?<namespace>[^\/]+)\/)?(?<name>.+)$/;
  const match = entityRef.match(regex);

  if (match && match.groups) {
    const kind = match.groups.kind || defaults.kind;
    const namespace = match.groups.namespace || defaults.namespace || DEFAULT_NAMESPACE;
    const name = match.groups.name;

    return {
      kind,
      namespace,
      name,
    };
  }

  throw new Error(`Invalid entity reference: ${entityRef}`);
};
