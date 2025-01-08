import { createTemplateAction } from '@backstage/plugin-scaffolder-node';

export const createWriterAction = () => {
  return createTemplateAction<{ messages: string[] }>({
    id: 'moonlight:writer',
    supportsDryRun: true,
    schema: {
      input: {
        required: ['messages'],
        type: 'object',
        properties: {
          messages: {
            type: 'array',
            title: 'Messages',
            description: 'As mensagens à serem exibidas.',
          },
        },
      },
    },
    async handler(ctx) {
      for await (const message of ctx.input.messages) {
        ctx.logStream.write(message);
      }
    },
  });
};
