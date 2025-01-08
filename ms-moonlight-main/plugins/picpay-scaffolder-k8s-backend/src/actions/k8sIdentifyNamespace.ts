// DEPRECATED: msprod, msqa doesnt exist anymore
import { NotFoundError } from '@backstage/errors';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export const k8sIdentifyNamespaceAction = (
  listNamespaces: (stage: string) => Promise<string[]>,
) => {
  return createTemplateAction<{
    namespaces: string[];
    clusters: string[];
    additionalErrorMessage?: string;
    throwExceptionOnError?: boolean;
  }>({
    id: 'moonlight:k8s-identify-namespace',
    schema: {
      input: {
        required: ['namespaces', 'clusters'],
        properties: {
          namespaces: {
            type: 'array',
            title: 'Name',
            description: 'The list of possible namespaces',
          },
          clusters: {
            type: 'array',
            title: 'Clusters',
            description: 'The list of clusters [msqa,msprod]',
          },
          additionalErrorMessage: {
            type: 'string',
            title: 'Additional Error Message',
            description: 'Suffix of error message',
          },
          throwExceptionOnError: {
            type: 'boolean',
            title: 'Throw Exception on Error',
            description: 'Should throw exception if no name is matched?',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        namespaces,
        clusters,
        additionalErrorMessage,
        throwExceptionOnError = false,
      } = ctx.input;
      const itemsFound: { [cluster: string]: string } = {};
      const itemsNotFound: Set<string> = new Set();
      for (const cluster of clusters) {
        for (const name of namespaces) {
          const allNamespaces = await listNamespaces(cluster);
          const nameExist = allNamespaces.find(i => i === name) !== undefined;

          if (nameExist) {
            ctx.logger.info(`namespace ${name} found in ${cluster}`);
            itemsFound[cluster] = name;
          } else {
            ctx.logger.warn(`namespace ${name} not found in ${cluster}`);
            itemsNotFound.add(name);
          }
        }
      }

      if (throwExceptionOnError && itemsNotFound.size === namespaces.length) {
        throw new NotFoundError(
          `namespaces not found: ${Array.from(itemsNotFound).join(', ')}. ${additionalErrorMessage || ''
          }`,
        );
      }

      for (const cluster of Object.keys(itemsFound)) {
        ctx.output(`namespace.${cluster}`, itemsFound[cluster]);
      }
    },
  });
};
