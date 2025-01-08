// DEPRECATED: SOS MSPROD is finished
import { JsonObject } from '@backstage/types';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export const migrateClusterInfoAction = () => {
  return createTemplateAction<{
    serviceName: string;
    bu: string;
    cluster: JsonObject;
    affinity: string;
  }>({
    id: 'moonlight:cluster-migrate-info',
    schema: {
      input: {
        required: ['serviceName', 'bu', 'cluster', 'affinity'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'serviceName',
            description: 'The name of the repository service',
          },
          bu: {
            type: 'string',
            title: 'BU`s Name',
            description: 'BU`s Name',
          },
          cluster: {
            type: 'object',
            title: 'cluster',
            description: 'Full name of the destiny cluster',
          },
          affinity: {
            type: 'string',
            title: 'Node Affinity Name',
            description: 'Node Affinity Name',
          },
        },
      },
    },
    async handler(ctx) {
      const { serviceName, bu, cluster, affinity } = ctx.input;

      ctx.logger.info('Cluster Migration Information');
      ctx.logger.info(`Component Name: ${serviceName}`);
      ctx.logger.info(`BU Name: ${bu}`);
      ctx.logger.info(`Cluster Name: ${JSON.stringify(cluster)}`);
      ctx.logger.info(`Node Affinity Name: ${affinity}`);
    },
  });
};
