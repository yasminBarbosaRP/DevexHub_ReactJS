import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { pushFilesToBranch } from '@internal/plugin-picpay-scaffolder-github-backend';
import { UrlReader } from '@backstage/backend-common';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { HelmchartsRepository } from '../repository/HelmchartsRepository';
import { HelmchartsOptions } from '../model/Helmcharts';
import {
  HandlingValuesFilesService as HelmchartsValueFiles,
  ValuesQaStrategy,
  ValuesProdStrategy,
  HandlingChartService as Chart,
} from '../service/service';

export const copyHelmchartsToArgoCdAction = (
  integrations: ScmIntegrations,
  reader: UrlReader,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    productionTag: string;
    stagingTag: string;
  }>({
    id: 'moonlight:copy-helmchart-files',
    schema: {
      input: {
        required: ['serviceName', 'productionTag', 'stagingTag'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'serviceName',
            description: 'The name of the repository service',
          },
          productionTag: {
            type: 'string',
            title: 'productionTag',
            description: 'Value of QA Environment',
          },
          stagingTag: {
            type: 'string',
            title: 'stagingTag',
            description: 'Value of Prod Environment',
          },
        },
      },
    },
    async handler(ctx) {
      const repository = ctx.input.serviceName;
      const tagHarnessQa = ctx.input.stagingTag;
      const tagHarnessValueProd = ctx.input.productionTag;
      const logger = ctx.logger;

      const options: HelmchartsOptions = {
        reader,
        integrations,
        context: ctx,
        repository,
      };
      const helmcharts = new HelmchartsRepository(options);
      await helmcharts.downloadHelmchats();

      const valueFiles = new HelmchartsValueFiles(
        helmcharts.directoryArgoCd,
        new ValuesQaStrategy(tagHarnessQa),
      );
      valueFiles.editFile();

      valueFiles.setStrategy(new ValuesProdStrategy(tagHarnessValueProd));
      valueFiles.editFile();

      const chartFile = new Chart(helmcharts.directoryArgoCd);
      chartFile.edit();

      const repositoryServiceInfra = `https://github.com/PicPay/${repository}-infra`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({
          url: repositoryServiceInfra,
        });
      const octokit = new Octokit({
        ...integrations,
        baseUrl: `https://api.github.com`,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
      });

      try {
        await pushFilesToBranch(
          octokit,
          'PicPay',
          `${repository}-infra`,
          'main',
          'main',
          `${ctx.workspacePath}/argocd/${repository}`,
          [`/chart`],
          `Feat: Cópia dos arquivos hemlcharts para o repo infra`,
        );
      } catch (e: any) {
        logger.info(e);
      }
    },
  });
};
