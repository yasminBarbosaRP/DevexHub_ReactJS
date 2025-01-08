import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { InputError } from '@backstage/errors';
import { CatalogApi } from '@backstage/catalog-client';
import YAML from 'js-yaml';
import {
  githubConnection,
  GithubRepository,
  BranchContent,
  decode,
  encode,
} from '@internal/plugin-picpay-core-components';
import { MoonlightTemplatesRepository } from '../repository/MoonlightTemplatesRepository';


export const extraContent = (owner: string, allowedOwners?: string[]) => {
  const defaultGroupAllowedView = [
    'squad-atlantis',
    owner,
  ];

  if (allowedOwners) {
    defaultGroupAllowedView.push(...allowedOwners);
  }

  const annotations = {
    'moonlight.picpay/hidden': 'true',
  };
  const groupAllowedView: string[] = Array.from(new Set(defaultGroupAllowedView));

  return {
    annotations,
    groupAllowedView
  }
};

export const validateTemplateName = (
  repositoryName: string,
  templateName: string,
  branchName: string
) => {
  if (templateName.replace('-qa', '') !== repositoryName) {
    throw new InputError(`Branch ${branchName.toUpperCase()} metadata.name: ${templateName.replace('-qa', '')} is different from repository name: ${repositoryName}`);
  }
}

export const validateOwner = (owner: string, templateOwner?: string) => {
  if (!templateOwner) {
    throw new InputError(`Template owner is not defined`);
  }

  if (templateOwner !== owner) {
    throw new InputError(`Owner ${owner} is different from template spec.owner ${templateOwner}`);
  }
}

export const existsQaBranch = async (repositoryName: string, branches: BranchContent[]): Promise<void> => {
  const hasBranchQa = branches.findIndex(branch => branch.name === 'qa');

  if (hasBranchQa < 0) {
    throw new Error(`Branch QA not found in repository ${repositoryName}`);
  }
}

export const templatesIntermediatorAction = (
  integrations: ScmIntegrations,
  githubCredentialsProvider: GithubCredentialsProvider,
  catalogClient: CatalogApi,
) => {
  return createTemplateAction<{
    templateName: string;
    owner: string;
  }>({
    id: 'moonlight:templates-intermediator',
    schema: {
      input: {
        required: ['templateName', 'owner'],
        type: 'object',
        properties: {
          templateName: {
            type: 'string',
            title: 'Template Name',
            description: 'Template Name',
          },
          owner: {
            type: 'string',
            title: 'Owner`s Name',
            description: 'Owner`s Name',
          },
        },
      },
    },
    async handler(ctx) {
      const { templateName, owner } = ctx.input;
      ctx.logger.info('Starting templates intermediator');
      ctx.logger.info(`Template Name: ${templateName}`);
      ctx.logger.info(`Owner: ${owner}`);

      const fileTemplate = 'template.yaml';
      const organization = 'PicPay';

      try {
        const shaBranchCommit: string[] = [];
        const github = await githubConnection(
          templateName,
          integrations,
          githubCredentialsProvider,
        );
        const githubRepository = new GithubRepository(github);
        const branches = await githubRepository.getRepositoryBranches(organization, templateName);
        await existsQaBranch(templateName, branches);

        const relevantBranches = branches.filter(branch => branch.name === 'main' || branch.name === 'qa');

        for (const branch of relevantBranches) {
          if (branch.name === 'main') {
            shaBranchCommit.push(branch.commit.sha);
          }

          const data = await githubRepository.getContent(
            organization,
            templateName,
            fileTemplate,
            branch.name,
          );

          const parse = JSON.parse(JSON.stringify(YAML.load(decode(data.content))));
          const validationResponse = await catalogClient.validateEntity(
            parse,
            `url:https://github.com/${organization}/${templateName}/blob/${branch.name}/${fileTemplate}`
          );

          if (validationResponse.valid === false) {
            throw new Error(validationResponse.errors[0].message);
          }

          validateTemplateName(templateName, parse.metadata.name, branch.name);
          validateOwner(owner, parse.spec?.owner);

          if (branch.name === 'qa') {
            const metadata = parse.metadata;
            const titleTemplate = parse.metadata.title;
            delete parse.metadata.name;
            delete parse.metadata.title
            delete parse.metadata.annotations;
            parse.metadata = {
              ...metadata,
              name: `${templateName}-qa`,
              title: `${titleTemplate}-QA`,
              ...extraContent(owner, parse.metadata.groupAllowedView)
            };

            const contentEncode = encode(YAML.dump(parse));
            const shaFile = await githubRepository.getShaFromFile(
              organization,
              templateName,
              branch.name,
              fileTemplate
            );
            const result = await githubRepository.createOrUpdateFile(
              organization,
              templateName,
              'qa',
              fileTemplate,
              contentEncode,
              `Update: Adicionando hidden true template para versao de QA Time Atlantis e ${owner}`,
              shaFile
            );

            if (result?.commit?.sha) {
              shaBranchCommit.push(result.commit.sha);
            } else {
              ctx.logger.error(`Unable to add the sha commit of the qa branch, please contact the Atlantis team`);
            }
          }
        }

        const moonlightTemplate = new MoonlightTemplatesRepository({
          githubRepository,
          organization,
          repository: templateName,
          sha: shaBranchCommit,
          logger: ctx.logger,
        });
        const contentMoonlightTemplates = await moonlightTemplate.changeContent(
          await moonlightTemplate.getTemplate(),
        );
        await moonlightTemplate.updateFileMoonlightTemplates(contentMoonlightTemplates);
      } catch (error: any) {
        ctx.logger.error(`Errors occurred while processing the template`);
        ctx.logger.error(`${error}`);
      }
    },
  });
};