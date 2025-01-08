import { createTemplateAction } from '@backstage/plugin-scaffolder-backend';
import { get as lodashGet } from 'lodash';
import _ from 'lodash';

export const createJsonMergeAction = () => {
  return createTemplateAction<{
    source: object | string | object[];
    destination: object | string | object[];
    replaceWithKey?: string;
  }>({
    id: 'moonlight:json:merge',
    supportsDryRun: true,
    description: 'Merges two JSON inputs into one, with source prevailing on conflicts. If arrays and replaceWithKey is provided, replaces destination elements matched by the key.',
    schema: {
      input: {
        required: ['source', 'destination'],
        type: 'object',
        properties: {
          source: {
            title: 'source',
            description: 'The source JSON data (string, object or array)',
            type: ['object', 'array', 'string'],
          },
          destination: {
            title: 'destination',
            description: 'The destination JSON data (string, object or array)',
            type: ['object', 'array', 'string'],
          },
          replaceWithKey: {
            title: 'replaceWithKey',
            description: 'Optional key path (e.g. "abc.name") to identify objects in arrays.',
            type: 'string',
          },
        },
      },
      output: {
        type: 'object',
        properties: {
          result: {
            type: ['object', 'array'],
            title: 'result',
            description: 'The merged JSON result.',
          },
        },
      },
    },
    async handler(ctx) {
      const { source, destination, replaceWithKey } = ctx.input;

      let src = source;
      let dest = destination;

      const parseIfString = (data: any) => {
        if (typeof data === 'string') {
          return JSON.parse(data);
        }
        return data;
      };

      try {
        src = parseIfString(src);
        dest = parseIfString(dest);
      } catch (err: any) {
        throw new Error(`Failed to parse input data: ${err.message}`);
      }

      const mergeDeep = (sourceVal: any, destVal: any): any => {
        if (Array.isArray(sourceVal) && Array.isArray(destVal) && replaceWithKey) {
          const resultArray = [];
          const sourceArray = sourceVal as any[];

          const sourceMap = new Map<string, any>();
          for (const sItem of sourceArray) {
            const sKeyVal = lodashGet(sItem, replaceWithKey);
            if (sKeyVal !== undefined) {
              sourceMap.set(sKeyVal, sItem);
            }
          }

          for (const dItem of destVal) {
            const dKeyVal = lodashGet(dItem, replaceWithKey);
            if (dKeyVal !== undefined && sourceMap.has(dKeyVal)) {
              resultArray.push(sourceMap.get(dKeyVal));
            } else {
              resultArray.push(dItem);
            }
          }

          for (const [sKeyVal, sItem] of sourceMap.entries()) {
            const existsInDest = destVal.some(dItem => lodashGet(dItem, replaceWithKey) === sKeyVal);
            if (!existsInDest) {
              resultArray.push(sItem);
            }
          }

          return resultArray;
        }

        if (Array.isArray(sourceVal) && Array.isArray(destVal) && !replaceWithKey) {
          return [...destVal, ...sourceVal];
        }

        if (_.isPlainObject(sourceVal) && Array.isArray(destVal)) {
          if (replaceWithKey) {
            const sKeyVal = lodashGet(sourceVal, replaceWithKey);
            if (sKeyVal !== undefined) {
              const destIndex = destVal.findIndex(dItem => lodashGet(dItem, replaceWithKey) === sKeyVal);
              if (destIndex >= 0) {
                destVal[destIndex] = mergeDeep(sourceVal, destVal[destIndex]);
              } else {
                destVal.push(sourceVal);
              }
              return destVal;
            }
          }
          return [...destVal, sourceVal];
        }

        if (_.isPlainObject(sourceVal) && _.isPlainObject(destVal)) {
          const merged = { ...destVal };
          for (const [key, sVal] of Object.entries(sourceVal)) {
            if (key in destVal) {
              merged[key] = mergeDeep(sVal, destVal[key]);
            } else {
              merged[key] = sVal;
            }
          }
          return merged;
        }

        return sourceVal;
      };

      const result = mergeDeep(src, dest);

      ctx.output('result', result);
    },
  });
};
