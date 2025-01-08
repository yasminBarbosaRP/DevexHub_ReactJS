import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { resolveSafeChildPath } from '@backstage/backend-common';
import { Octokit } from 'octokit';
import { InputError } from '@backstage/errors';
import { DeployType } from '@internal/plugin-picpay-scaffolder-identify-cd-backend';
import {
  ValuesQaStrategy,
  ValuesProdStrategy,
  Chart,
} from '@internal/plugin-picpay-scaffolder-copy-helm-agorcd-backend';
import GithubService from '../service/github';
import { Charts } from '../service/Charts';
import {
  decode,
  sanitizeMicroserviceName,
} from '@internal/plugin-picpay-core-components';
import fs from 'fs-extra';
import YAML from 'js-yaml';
import { HelmchartsMigrateCluster } from '../service/HelmchartsMigrateCluster';
import { JsonObject } from '@backstage/types';

const contentChartFile = async (
  path: string,
  octokit: Octokit,
): Promise<Chart> => {
  const { data } = await octokit.request(`GET ${path}/Chart.yaml`);
  return JSON.parse(JSON.stringify(YAML.load(decode(data.content))));
};

const contentValuesFile = async (
  tempPathServiceName: string,
  path: string,
  environment: string,
  octokit: Octokit,
): Promise<void> => {
  const fileName = `values.${environment}.yaml`;
  const { data } = await octokit.request(`GET ${path}/${fileName}`);

  fs.mkdirSync(tempPathServiceName, { recursive: true });
  fs.writeFileSync(
    `${tempPathServiceName}/${fileName}`,
    decode(data.content),
    'utf8',
  );
};

const nameFileTgz = async (path: string, octokit: Octokit): Promise<string> => {
  const { data } = await octokit.request(`GET ${path}/charts`);
  return data[0].hasOwnProperty('name') ? data[0].name : '';
};

const cleanUp = (workspace: string) => {
  try {
    fs.rmSync(workspace, { recursive: true });
  } catch (e: any) {
    throw e;
  }
};

export const updateHelmcharts = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    deployType: string;
    affinity: string;
    environments: string[];
    branch?: string;
    externalSecretsMountPath: JsonObject;
    bu: string;
    segregateChartsByEnvironment: boolean;
  }>({
    id: 'moonlight:update-migrate-helmcharts',
    schema: {
      input: {
        required: ['serviceName', 'deployType'],
        type: 'object',
        properties: {
          serviceName: {
            type: 'string',
            title: 'serviceName',
            description: 'The name of the repository service',
          },
          branch: {
            type: 'string',
            title: 'branch',
            description: 'The name of the branch of the pull request',
          },
          deployType: {
            type: 'string',
            title: 'deployType',
            description: 'The deployment type used by the microservice',
          },
          affinity: {
            type: 'string',
            title: 'Affinity Name',
            description: 'Affinity Name',
          },
          environments: {
            type: 'array',
            title: 'Environments',
            description: 'Environments to be Updated',
          },
          externalSecretsMountPath: {
            type: 'json',
            title: 'External Secretes Mount Path',
            description: 'The list of possible mount path',
          },
          bu: {
            type: 'string',
            title: 'Bu',
            description: "Bu's Name",
          },
          segregateChartsByEnvironment: {
            type: 'boolean',
            title: 'Segregate Charts by Environment',
            description:
              'Segregate Charts by Environment, creating picpay-ms for production and picpay-ms-qa for homolog',
          },
        },
      },
    },
    async handler(ctx) {
      const deployType = ctx.input.deployType;
      const serviceName =
        deployType === DeployType.ARGOCD &&
        ctx.input.serviceName.startsWith('picpay-dev')
          ? ctx.input.serviceName
          : sanitizeMicroserviceName(ctx.input.serviceName);
      const affinityName = ctx.input.affinity;
      const environments = ctx.input.environments;
      const branch = ctx.input.branch;
      const bu = ctx.input.bu;
      const externalSecretsMountPath = ctx.input.externalSecretsMountPath;
      const segregateChartsByEnvironment =
        ctx.input.segregateChartsByEnvironment;
      const logger = ctx.logger;

      logger.info(`Environments: ${environments}`);
      if (
        !environments ||
        (!environments.includes('prod') && !environments.includes('qa'))
      )
        throw new InputError('environments should contain either prod or qa');

      const workDir = resolveSafeChildPath(ctx.workspacePath, `./`);

      logger.info('Discovery Helmcharts Version');
      logger.info(`Deploy Type: ${deployType}`);

      if (DeployType.NOT_IDENTIFIED === deployType) {
        throw new InputError('CD Not Identified');
      }

      const baseUrl = `https://api.github.com`;
      const owner = 'PicPay';
      let repoURL: string = '';
      let path: string = '';
      let workDirCharts: string = '';
      let repoContainsHelmName: string = '';
      let cwdPath: string = '';
      let filesPath: string = '';
      const valuesHelmcharts: string[] = [];

      switch (deployType) {
        case DeployType.ARGOCD:
          repoURL = `https://github.com/PicPay/${serviceName}-infra/`;
          path = `/repos/${owner}/${serviceName}-infra/contents/chart`;
          workDirCharts = `/${serviceName}-infra/chart`;
          repoContainsHelmName = `${serviceName}-infra`;
          cwdPath = `${workDir}/${serviceName}-infra`;
          filesPath = 'chart';
          break;
        case DeployType.HARNESS:
          repoURL = `https://github.com/PicPay/helm-charts/`;
          path = `/repos/${owner}/helm-charts/contents/services/${serviceName}`;
          workDirCharts = `/helmcharts/services/${serviceName}`;
          repoContainsHelmName = 'helm-charts';
          cwdPath = `${workDir}/helmcharts`;
          filesPath = `services/${serviceName}`;
          break;
        default:
          throw new InputError('CD Not Identified');
      }

      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });
      const octokit = new Octokit({
        ...integrations,
        baseUrl: baseUrl,
        headers: {
          Accept: 'application/vnd.github.machine-man-preview+json',
        },
        auth: credentialProviderToken?.token,
        previews: ['nebula-preview'],
      });

      const githubService = new GithubService(ctx.logger, octokit);
      const defaultBranchName = await githubService.getDefaultBranch(
        repoContainsHelmName,
        'PicPay',
      );
      const targetBranch =
        branch ||
        `feature/${serviceName}-cluster-migration-${environments.join('-')}`;

      try {
        for await (const environment of environments) {
          await contentValuesFile(
            `${workDir}${workDirCharts}`,
            path,
            environment,
            octokit,
          );

          const strategy =
            environment === 'prod'
              ? new ValuesProdStrategy('')
              : new ValuesQaStrategy('');

          const valueFiles = new HelmchartsMigrateCluster({
            pathTemporaryServiceName: `${workDir}${workDirCharts}`,
            strategy,
            nodeAffinity: affinityName,
            externalSecretsMountPath:
              externalSecretsMountPath[environment]?.toString(),
            bu,
            environment,
            segregateChartsByEnvironment,
          });
          valueFiles.runEdit();

          valuesHelmcharts.push(`${filesPath}/values.${environment}.yaml`);
        }

        const contentChartYaml: Chart = await contentChartFile(path, octokit);
        const chartFile = new Charts(
          `${workDir}${workDirCharts}`,
          contentChartYaml,
          environments,
          segregateChartsByEnvironment,
        );
        chartFile.edit();

        const helmchartsCompiled = await nameFileTgz(path, octokit);
        ctx.logger.info(`Helmcharts Files .tgz ${helmchartsCompiled}`);

        await githubService.pushFilesToBranch(
          'PicPay',
          repoContainsHelmName,
          targetBranch,
          defaultBranchName,
          `${cwdPath}`,
          [`${filesPath}/Chart.yaml`, ...valuesHelmcharts],
          `Fix: Change values ${environments.join(
            ' and ',
          )} to migrate the new cluster`,
        );

        const result = await githubService.createPullRequest(
          'PicPay',
          repoContainsHelmName,
          `Cluster Migration Update Helmcharts ${serviceName}`,
          `This PullRequest fixes the values ${environments.join(
            ' and ',
          )} to migrate the new cluster`,
          targetBranch,
          defaultBranchName,
        );

        ctx.output('pull_request_url', result.url);
        ctx.output('pull_request_number', result.number);
      } catch (err: any) {
        ctx.logger.error(err);

        const message: string = err.message;

        if (
          message.includes('pull request already exists') ||
          message.toLocaleUpperCase() === 'GITRPC::BADOBJECTSTATE'
        ) {
          const result = await githubService.getPullRequest(
            'PicPay',
            repoContainsHelmName,
            targetBranch,
            defaultBranchName,
          );
          ctx.output('pull_request_url', result.url);
          ctx.output('pull_request_number', result.number);

          return;
        }

        throw err;
      } finally {
        logger.info('Deleting Helmcharts files');
        cleanUp(cwdPath);
      }
    },
  });
};
