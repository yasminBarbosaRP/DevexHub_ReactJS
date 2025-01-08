import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { ScmIntegrations } from '@backstage/integration';
import { resolveSafeChildPath, UrlReader } from '@backstage/backend-common';
import { AlfredRepository } from '../repository/AlfredRepository';

export const validateStructureAction = (
  integrations: ScmIntegrations,
  reader: UrlReader,
) => {
  return createTemplateAction<{
    repository: string;
    mainPath: string;
    content: {
      path?: string;
      structure: {
        type: string;
        name: string[];
      }[];
    }[];
    throwError?: boolean;
  }>({
    id: 'moonlight:alfred-validate-structure',
    schema: {
      input: {
        required: ['repository', 'mainPath'],
        properties: {
          repository: {
            type: 'string',
            title: 'Repository name',
            description: 'Name of the infra repository',
          },
          mainPath: {
            type: 'string',
            title: 'Main Path Alfred',
            description: 'Alfred structure path',
          },
          content: {
            type: 'array',
            title: 'Directories/Files',
            description: 'Validate Files/Directories',
            path: {
              type: 'string',
              title: 'Alfred Path Subdirectories',
              description: 'Alfred Path Subdirectories',
            },
            items: {
              type: 'object',
              required: ['type', 'name'],
              properties: {
                type: {
                  type: 'string',
                  title: 'Type',
                  description: 'Content type dir or file',
                },
                name: {
                  type: 'array',
                  title: 'Name',
                  description: 'Name of folders or files',
                  minItems: 1,
                },
              },
            },
            throwError: {
              type: 'boolean',
              title: 'Throw Error',
              description: 'Throw error on execution',
            },
          },
        },
      },
    },
    async handler(ctx) {
      ctx.logger.info('Validate Alfred Skeleton');
      const { repository, mainPath, content, throwError } = ctx.input;

      const workDir = resolveSafeChildPath(
        ctx.workspacePath,
        `./${repository}`,
      );
      const alfred = new AlfredRepository({
        repository,
        workDir,
        reader,
        integrations,
        baseUrl: ctx.templateInfo?.baseUrl ?? '',
      });

      await alfred.getRepository();
      const validateResult = await alfred.validateFileStructure({
        mainPath,
        throwError,
        content,
      });

      ctx.logger.info(`Repository: ${repository}`);
      ctx.logger.info(`Alfred Skeleton Path: ${mainPath}`);

      if (validateResult.length > 0) {
        ctx.logger.error(
          `Alfred structure of files and directories is not valid`,
        );
        validateResult.forEach(result => {
          ctx.logger.error(`${result.message}`);
        });
      } else {
        ctx.logger.info(`Alfreds structure validation completed successfully`);
      }
    },
  });
};
