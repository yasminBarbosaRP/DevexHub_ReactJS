import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import YAML from 'js-yaml';

export const createEnvsAction = () => {
  return createTemplateAction<{
    envs: {
      name: string;
      value: string;
    }[];
  }>({
    id: 'moonlight:create-envs',
    supportsDryRun: true,
    examples: [
      {
        description: 'Get a file then read it as Object',
        example: YAML.dump({
          steps: [
            {
              action: 'fetch:plain:file',
              id: 'fetch',
              name: 'Fetch catalog entity',
              input: {
                url: 'https://github.com/PicPay/${{ parameters.name }}/blob/main/catalog-info.yaml',
                targetPath: './repository/catalog-info.yaml',
              },
            },
            {
              action: 'moonlight:create-envs',
              id: 'global',
              name: 'Creates envs as outputs for this action',
              input: {
                envs: [
                  {
                    name: "testing",
                    value: "${{ parameters.fetch }}"
                  }
                ],
              },
            },
          ],
        }),
      },
    ],
    schema: {
      input: {
        required: ['envs'],
        type: 'object',
        properties: {
          envs: {
            type: 'array',
            title: 'envs',
            description: 'Envs to be included on output',
            properties: {
              name: {
                type: 'string',
                title: 'name',
                description: 'Name of the env',
              },
              value: {
                type: 'string',
                title: 'value',
                description: 'Value of the env',
              },
            },
          },
        },
        output: {
          type: 'object',
          properties: {
            example: {
              type: 'object',
              title: 'example',
              description: 'example is an example from envs input',
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { envs = [] } = ctx.input;
      for (const env of envs) {
        ctx.output(env.name, env.value);
      }
    },
  });
};
