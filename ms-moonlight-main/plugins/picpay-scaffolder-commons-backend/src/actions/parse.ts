import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import YAML from 'js-yaml';

export const createJsonParseAction = () => {
  return createTemplateAction<{
    data: string | object | object[];
  }>({
    id: 'moonlight:json:parse',
    supportsDryRun: true,
    examples: [
      {
        description: 'Parses an input into a JSON output',
        example: YAML.dump({
          steps: [
            {
              action: 'moonlight:json:parse',
              id: 'global',
              name: 'Parsing data',
              input: {
                envs: [
                  {
                    data: "{\"name\": \"John\"}",
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
        required: ['data'],
        type: 'object',
        properties: {
          data: {
            title: 'data',
            description: 'Data that will be converted to JSON',
            type: [
              'object',
              'array',
              'string',
            ],
          },
        },
        output: {
          type: 'object',
          properties: {
            result: {
              type: 'object',
              title: 'result',
              description: 'result of the convertion',
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { data } = ctx.input;

      try {
        if (typeof data === "string") {
          ctx.output("result", JSON.parse(data));
        } else if (Array.isArray(data)) {
          ctx.output("result", data.map(item => typeof item === "string" ? JSON.parse(item) : item));
        } else if (typeof data === "object") {
          ctx.output("result", data);
        }
      } catch (err: any) {
        throw new Error(`Failed to parse data: ${err.message}`);
      }
    }
  });
};


export const createYamlParseAction = () => {
  return createTemplateAction<{
    data: string | object | object[];
    toJSON: boolean;
    toMultipleObjects: boolean;
  }>({
    id: 'moonlight:yaml:parse',
    supportsDryRun: true,
    examples: [
      {
        description: 'Parses an input into an YAML output',
        example: YAML.dump({
          steps: [
            {
              action: 'moonlight:yaml:parse',
              id: 'global',
              name: 'Parsing data',
              input: {
                envs: [
                  {
                    data: "{\"name\": \"John\"}",
                    toJSON: false,
                    toMultipleObjects: true
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
        required: ['data'],
        type: 'object',
        properties: {
          toJSON: {
            title: 'toJSON',
            description: 'If set to true, it will convert the result to JSON',
            type: 'boolean',
          },
          toMultipleObjects: {
            title: 'toMultipleObjects',
            description: 'If set to true, it will return multiple YAML objects',
            type: 'boolean',
          },
          data: {
            title: 'data',
            description: 'Data that will be converted to JSON',
            type: [
              'object',
              'array',
              'string',
            ],
          },
        },
        output: {
          type: 'object',
          properties: {
            result: {
              type: ['object', 'string'],
              title: 'result',
              description: 'result of the convertion',
            },
          },
        },
      },
    },

    async handler(ctx) {
      const { data, toJSON = false, toMultipleObjects = false } = ctx.input;

      try {
        if (toJSON) {
          if (typeof data === "string") {
            ctx.output("result", JSON.parse(data));
          } else if (Array.isArray(data)) {
            ctx.output("result", data.map(item => typeof item === "string" ? JSON.parse(item) : item));
          } else if (typeof data === "object") {
            ctx.output("result", data);
          }
        } else {
          if (typeof data === "string") {
            const parsedData = JSON.parse(data);
            if (toMultipleObjects && Array.isArray(parsedData)) {
              ctx.output("result", parsedData.map(doc => YAML.dump(doc)).join('\n---\n'));
            } else {
              ctx.output("result", YAML.dump(parsedData));
            }
          } else if (Array.isArray(data)) {
            const parsedData = data.map(item => 
              typeof item === "string" ? JSON.parse(item) : item
            );
            if (toMultipleObjects) {
              ctx.output("result", parsedData.map(doc => YAML.dump(doc)).join('\n---\n'));
            } else {
              ctx.output("result", YAML.dump(parsedData));
            }
          } else if (typeof data === "object") {
            ctx.output("result", YAML.dump(data));
          }
        }
      } catch (err: any) {
        throw new Error(`Failed to convert data to ${toJSON ? 'JSON' : 'YAML'}: ${err.message}`);
      }
    }
  });
};
