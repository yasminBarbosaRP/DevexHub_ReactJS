import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath } from '@backstage/backend-common';
import { InputError } from '@backstage/errors';
import fs from 'fs-extra';
import YAML from 'js-yaml';

export const readFileAction = () => {
  return createTemplateAction<{
    path: string;
    outputFormat?: 'object' | 'text';
    fileFormat?: 'json' | 'yaml' | 'text';
  }>({
    id: 'moonlight:utils:fs:read-file',
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
              action: 'moonlight:utils:fs:read-file',
              id: 'read',
              name: 'Read Catalog Info as Object',
              input: {
                path: './repository/catalog-info.yaml',
                outputFormat: 'object',
              },
            },
          ],
        }),
      },
    ],
    schema: {
      input: {
        required: ['path'],
        type: 'object',
        properties: {
          path: {
            type: 'string',
            title: 'filePath',
            description: 'The Path of the file you want to output',
          },
          outputFormat: {
            type: 'string',
            title: 'outputFormat',
            description:
              'The format of the output, object or text. With object you can access the keys. If the file is a YAML, the output will be an object',
          },
          fileFormat: {
            type: 'string',
            title: 'fileFormat',
            description:
              'The file format can be: json, yaml or text. If not informed, the file format will be inferred from the file extension',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          data: {
            type: 'string|object',
            title: 'data',
            description: 'The data of the file',
          },
        },
      },
    },
    async handler(ctx) {
      const { path, outputFormat = 'text', fileFormat } = ctx.input;
      const sourceFilepath = resolveSafeChildPath(ctx.workspacePath, path);

      const fileData = fs.readFileSync(sourceFilepath, 'utf-8');
      let data: object | string;
      if (outputFormat === 'text') {
        data = fileData.toString();
      } else if (fileFormat === 'json' || path.endsWith('.json')) {
        data = JSON.parse(fileData);
      } else if (
        fileFormat === 'yaml' ||
        path.endsWith('.yaml') ||
        path.endsWith('.yml')
      ) {
        data = YAML.load(fileData) as object;
      } else if (outputFormat === 'object') {
        try {
          try {
            data = JSON.parse(fileData);
          } catch (_) {
            data = YAML.load(fileData) as object;
          }
        } catch (_) {
          throw new InputError(`Unable to find file format for ${path}`);
        }
      } else {
        throw new InputError(`Unable to find file format for ${path}`);
      }

      ctx.output('data', data);
    },
  });
};
