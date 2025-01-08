import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import { fetchContents } from '@backstage/plugin-scaffolder-backend';
import { pushFilesToBranch } from '../service/github-push-to-branch-service';
import { resolveSafeChildPath, UrlReader } from '@backstage/backend-common';
import { runCommandInCwd, stringToBoolean } from '../service/helpers-service';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { copyFileSync, unlinkSync } from 'fs-extra';
import { basename } from 'path';
import { Octokit } from 'octokit';

export const createHelmchartsAction = (
  integrations: ScmIntegrations,
  reader: UrlReader,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    skipDepUp: string | boolean;
    pullRequest: string | boolean;
    valuesFilePath: string[];
  }>({
    id: 'moonlight:helmcharts',
    schema: {
      input: {
        required: ['serviceName'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'ServiceName',
            description: 'The name of the service',
          },
          skipDepUp: {
            type: ['string', 'boolean'],
            title: 'skipDepUp',
            description: 'Skips `helm dep update` on service folder.',
          },
          pullRequest: {
            type: ['string', 'boolean'],
            title: 'pullRequest',
            description:
              'Creates a Pull Request instead of pushing directly to base branch.',
          },
          valuesFilePath: {
            type: 'array',
            title: 'ServiceName',
            description: 'The name of the service',
          },
        },
      },
    },
    async handler(ctx) {
      const serviceName = ctx.input.serviceName;
      const skipDepUp = stringToBoolean(ctx.input.skipDepUp);
      const valuesFilePath = ctx.input.valuesFilePath;
      const logger = ctx.logger;

      // Baixa o repo do helmcharts
      const pathChart = './helmcharts/charts/picpay-ms';
      const chartUrl =
        'https://github.com/PicPay/helm-charts/tree/master/charts/picpay-ms';
      const outputPath = resolveSafeChildPath(ctx.workspacePath, pathChart);
      await fetchContents({
        reader,
        integrations,
        baseUrl: ctx.templateInfo?.baseUrl,
        fetchUrl: chartUrl,
        outputPath,
      });

      // Copia os arquivos
      for (const filePath of valuesFilePath) {
        const chartServicePath = `./helmcharts/services/${serviceName}/${basename(
          filePath,
        )}`;
        copyFileSync(
          resolveSafeChildPath(ctx.workspacePath, filePath),
          resolveSafeChildPath(ctx.workspacePath, chartServicePath),
        );
      }

      // Cria o lock
      if (!skipDepUp) {
        const chartService = `./helmcharts/services/${serviceName}`;
        const helmChartDir = resolveSafeChildPath(
          ctx.workspacePath,
          chartService,
        );
        await runCommandInCwd(
          'helm',
          ['dep', 'update'],
          helmChartDir,
          ctx.logStream,
        );
      }

      const helmChartUrl = `https://github.com/PicPay/helm-charts`;
      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({
          url: helmChartUrl,
        });

      // Push direto na branch
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
          'helm-charts',
          'master',
          'master',
          `${ctx.workspacePath}/helmcharts`,
          [`services/${serviceName}`],
          `feat: adiciona as configurações do chart do serviço ${serviceName}`,
        );
      } catch (e: any) {
        logger.info(e);
      }

      // Delete files
      for (const filePath of valuesFilePath) {
        unlinkSync(resolveSafeChildPath(ctx.workspacePath, filePath));
      }
    },
  });
};
