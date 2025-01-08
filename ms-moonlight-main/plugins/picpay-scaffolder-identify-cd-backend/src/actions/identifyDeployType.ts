import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { Got } from 'got';
import { Argocd, DeployType, Harness } from '../service';

export const identifyDeployTypeAction = (clientGot: Got) => {
  return createTemplateAction<{
    serviceName: string;
  }>({
    id: 'moonlight:identify-deploy-type',
    schema: {
      input: {
        required: ['serviceName'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'Service Name',
            description: 'Service Name',
          },
        },
      },
    },
    async handler(ctx) {
      const { serviceName } = ctx.input;

      let deployType: string = DeployType.NOT_IDENTIFIED;

      ctx.logger.info('Verifing application on ArgoCd');
      // no caso do argo verificar porque a application está microservice-prd e microservice-hom
      const argocd = new Argocd(serviceName, ctx.logger, clientGot);
      await argocd.auth();
      deployType = await argocd.hasApplication();

      if (deployType === '') {
        ctx.logger.info('Verifing application on the Harness');
        const harness = new Harness(serviceName, ctx.logger, clientGot);
        deployType = await harness.hasApplication();
      }

      ctx.logger.info(`deployType: ${deployType}`);
      ctx.output('deployType', deployType);
    },
  });
};
