import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { createNamespace } from '@internal/plugin-picpay-scaffolder-k8s-backend';
import {
  createAndAssocieteEnvs,
  OpsdashHelper,
} from '../service/opsdash-service';

export const createOpsdashAction = () => {
  return createTemplateAction<{
    serviceName: string;
    environments: string[];
    envs: { name: string; alias: string; value?: string }[];
  }>({
    id: 'moonlight:opsdash',
    schema: {
      input: {
        required: ['serviceName', 'environments', 'envs'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'Service Name',
            description: 'Nome do serviço',
          },
          environments: {
            type: 'array',
            title: 'Environments',
            description: 'Ambientes à serem deployados as envs',
            minItems: 1,
            items: {
              type: 'string',
            },
          },
          envs: {
            type: 'array',
            title: 'Envs',
            description: 'Variáveis de ambiente à serem adicionadas',
            items: {
              type: 'object',
              required: ['name', 'alias'],
              properties: {
                name: {
                  type: 'string',
                  title: 'Name',
                  description:
                    'Nome da variável. Se ela já existir, só será feita a nova associação, caso contrário ela será criada.',
                },
                alias: {
                  type: 'string',
                  title: 'Alias',
                  description: 'Nome da variável dentro do serviço',
                },
                value: {
                  type: 'string',
                  title: 'Alias',
                  description: 'Valor da variável se ela tiver que ser criada.',
                },
              },
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { serviceName, environments, envs } = ctx.input;
      const opsdash = new OpsdashHelper(ctx.logger);
      for await (const stage of environments) {
        ctx.logger.info(
          `Criando namespace ms-${serviceName} no ambiente ${stage}`,
        );
        await createNamespace(ctx.logger, serviceName, stage);
        const opsdashStage = stage.replace('ms', '');
        await createAndAssocieteEnvs(
          opsdash,
          ctx.logger,
          serviceName,
          opsdashStage,
          envs,
        );
      }
    },
  });
};
