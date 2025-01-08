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

const createGithubConnection = async (
  repository: string,
  integrations: ScmIntegrations,
  credentialProviderToken?: GithubCredentialsProvider,
): Promise<Octokit> => {
  const repositoryURL = `https://github.com/PicPay/${repository}`;
  const credentials = await credentialProviderToken?.getCredentials({
    url: repositoryURL,
  });
  return new Octokit({
    ...integrations,
    baseUrl: 'https://api.github.com',
    headers: {
      Accept: 'application/vnd.github.machine-man-preview+json',
    },
    auth: credentials?.token,
  });
};

export const updateInfraHelmchartsAction = (
  integrations: ScmIntegrations,
  reader: UrlReader,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    skipDepUp: string | boolean;
    pullRequest: string | boolean;
    valuesFilePath: string[];
    bu: string;
    vaultRoleName: string;
  }>({
    id: 'moonlight:infra-helmcharts',
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
          bu: {
            type: 'string',
            title: 'BU`s Name',
            description: 'BU`s Name',
          },
          vaultRoleName: {
            type: 'string',
            title: 'Access Role Name',
            description: 'Access Role Name',
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
      const pathChart = './helmcharts/chart';
      const chartUrl = `https://github.com/PicPay/${serviceName}/tree/main/chart`;
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
        const chartServicePath = `./helmcharts/chart/${basename(filePath)}`;
        copyFileSync(
          resolveSafeChildPath(ctx.workspacePath, filePath),
          resolveSafeChildPath(ctx.workspacePath, chartServicePath),
        );
      }

      // Cria o lock
      if (!skipDepUp) {
        const chartService = `./helmcharts/chart/`;
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

      const octokit = await createGithubConnection(
        serviceName,
        integrations,
        githubCredentialsProvider,
      );
      try {
        await pushFilesToBranch(
          octokit,
          'PicPay',
          serviceName,
          'main',
          'main',
          `${ctx.workspacePath}/helmcharts`,
          [`chart`],
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
