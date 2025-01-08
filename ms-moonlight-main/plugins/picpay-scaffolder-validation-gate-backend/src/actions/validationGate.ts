import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { InputError, NotAllowedError } from '@backstage/errors';

export type Validations = {
  name: string;
  errorMessage: string;
  comparisonFilter?: {
    name: string;
    originalValue: number;
    operation: string;
    number: number;
  }[];
  match?: {
    name: string;
    rule: string;
    value: string;
  }[];
};

export const validationGateAction = () => {
  return createTemplateAction<Validations>({
    id: 'moonlight:validation-gate',
    schema: {
      input: {
        required: ['name'],
        type: 'object',
        properties: {
          name: {
            type: 'string',
            title: 'name',
            description: 'The name of the service',
          },
          comparisonFilter: {
            type: 'array',
            title: 'comparisonFilter',
            description:
              'Filter to make number comparison (operations allowed: <, >, <=, >=, ==)',
          },
          match: {
            type: 'array',
            title: 'match',
            description: 'Match a string using regex',
          },
        },
      },
    },
    async handler(ctx) {
      const { name, errorMessage, comparisonFilter, match } = ctx.input;

      const errors = [];
      if (!comparisonFilter && !match)
        throw new InputError(
          'comparisonFilter or match needs to be filled on Template',
        );

      ctx.logger.info(`Validating ${name}`);

      for (const filter of comparisonFilter || []) {
        const originalValue =
          typeof filter.originalValue === 'string' &&
          (filter.originalValue as string).includes('.')
            ? parseFloat(filter.originalValue)
            : Number(filter.originalValue);
        const numberValue =
          typeof filter.number === 'string' &&
          (filter.number as string).includes('.')
            ? parseFloat(filter.number)
            : Number(filter.number);

        switch (filter.operation) {
          case '<':
            ctx.logger.debug(
              `comparisonFilter originalValue:${
                filter.originalValue
              }:${typeof originalValue}, number:${
                filter.number
              }::${typeof numberValue} resulted on ${JSON.stringify(
                originalValue >= numberValue,
              )}`,
            );
            if (originalValue >= numberValue) {
              errors.push(
                `validation for ${filter.name} failed: ${originalValue} should be lower than ${numberValue}`,
              );
            }
            break;
          case '>':
            ctx.logger.debug(
              `comparisonFilter originalValue:${
                filter.originalValue
              }:${typeof originalValue}, number:${
                filter.number
              }::${typeof numberValue} resulted on ${JSON.stringify(
                originalValue <= numberValue,
              )}`,
            );
            if (originalValue <= numberValue) {
              errors.push(
                `validation for ${filter.name} failed: ${originalValue} should be greater than ${numberValue}`,
              );
            }
            break;
          case '>=':
            ctx.logger.debug(
              `comparisonFilter originalValue:${
                filter.originalValue
              }:${typeof originalValue}, number:${
                filter.number
              }::${typeof numberValue} resulted on ${JSON.stringify(
                originalValue >= numberValue,
              )}`,
            );
            if (originalValue < numberValue) {
              errors.push(
                `validation for ${filter.name} failed: ${originalValue} should be greater or equal to ${numberValue}`,
              );
            }
            break;
          case '<=':
            ctx.logger.debug(
              `comparisonFilter originalValue:${
                filter.originalValue
              }:${typeof originalValue}, number:${
                filter.number
              }::${typeof numberValue} resulted on ${JSON.stringify(
                originalValue > numberValue,
              )}`,
            );
            if (originalValue > numberValue) {
              errors.push(
                `validation for ${filter.name} failed: ${originalValue} should be lower or equal to ${numberValue}`,
              );
            }
            break;
          case '==':
            ctx.logger.debug(
              `comparisonFilter originalValue:${
                filter.originalValue
              }:${typeof originalValue}, number:${
                filter.number
              }::${typeof numberValue} resulted on ${JSON.stringify(
                originalValue !== numberValue,
              )}`,
            );
            if (originalValue !== numberValue) {
              errors.push(
                `validation for ${filter.name} failed: ${originalValue} should be equal to ${numberValue}`,
              );
            }
            break;
          default:
            throw new InputError(
              `invalid comparisonFilter operation: ${filter.operation}`,
            );
        }
      }

      for (const filter of match || []) {
        ctx.logger.info(
          `regex applied rule:${filter.rule}, value:${
            filter.value
          }: ${JSON.stringify(new RegExp(filter.rule).test(filter.value))}`,
        );
        if (!new RegExp(filter.rule).test(filter.value)) {
          errors.push(
            `validation for ${filter.name} failed: ${filter.value} didn't match ${filter.rule}`,
          );
        }
      }

      if (errors.length > 0) {
        ctx.logger.error(errorMessage);
        for (const err of errors) {
          ctx.logger.error(err);
        }
        throw new NotAllowedError(errors.join('\n'));
      }
    },
  });
};
