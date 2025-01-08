import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import { Octokit } from 'octokit';
import { InputError } from '@backstage/errors';
import YAML from 'js-yaml';
import { DeployType } from '@internal/plugin-picpay-scaffolder-identify-cd-backend';
import { sanitizeMicroserviceName } from '@internal/plugin-picpay-core-components';

const decode = (str: string): string =>
  Buffer.from(str, 'base64').toString('binary');

const getVersionHelmcharts = async (path: string, octokit: Octokit) => {
  const { data } = await octokit.request(`GET ${path}/Chart.yaml`);
  const parse = JSON.parse(JSON.stringify(YAML.load(decode(data.content))));

  return parse.dependencies[0].version.replace(/>|=|</g, '');
};

const hasBanzaicloud = async (
  path: string,
  helmValuesFile: string,
  octokit: Octokit,
) => {
  const { data } = await octokit.request(`GET ${path}/${helmValuesFile}`);
  const parse = JSON.parse(JSON.stringify(YAML.load(decode(data.content))));
  const node = parse['picpay-ms'] || parse['picpay-ms-v2'];
  let isBanzaicloud: string = 'false';

  const nodeKeys = ['apis', 'workers', 'cronjobs'];

  nodeKeys.forEach((key: string) => {
    if (!node[key]) {
      return;
    }

    for (const index in node[key]) {
      if (
        node[key][index].annotations &&
        Object.keys(node[key][index].annotations)
          .join('|')
          .search('banzaicloud.io') >= 0
      ) {
        isBanzaicloud = 'true';
        return;
      }
    }
  });

  return isBanzaicloud;
};

export const discoveryVersionHelmAtion = (
  integrations: ScmIntegrations,
  githubCredentialsProvider?: GithubCredentialsProvider,
) => {
  return createTemplateAction<{
    serviceName: string;
    deployType: string;
  }>({
    id: 'moonlight:discovery-version-helmcharts',
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
          deployType: {
            type: 'string',
            title: 'deployType',
            description: 'the deployment type used by the microservice',
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
          : sanitizeMicroserviceName(
              ctx.input.serviceName.replace(/^(picpay-dev-)/, ''),
            );
      const logger = ctx.logger;

      logger.info('Discovery Helmcharts Version');
      logger.info(`Deploy Type: ${deployType}`);
      logger.info(`Service Name: ${serviceName}`);
      logger.info(`Original Service Name: ${ctx.input.serviceName}`);

      const baseUrl = `https://api.github.com`;
      const owner = 'PicPay';
      let repoURL: string = '';
      let pathHelmcharts: string = '';

      switch (deployType) {
        case DeployType.ARGOCD:
          repoURL = `https://github.com/PicPay/${serviceName}-infra/`;
          pathHelmcharts = `/repos/${owner}/${serviceName}-infra/contents/chart`;
          break;
        case DeployType.HARNESS:
          repoURL = `https://github.com/PicPay/helm-charts/`;
          pathHelmcharts = `/repos/${owner}/helm-charts/contents/services/${serviceName}`;
          break;
        default:
          throw new InputError('CD Not Identified');
      }

      const credentialProviderToken =
        await githubCredentialsProvider?.getCredentials({ url: repoURL });
      try {
        const octokit = new Octokit({
          ...integrations,
          baseUrl: baseUrl,
          headers: {
            Accept: 'application/vnd.github.machine-man-preview+json',
          },
          auth: credentialProviderToken?.token,
          previews: ['nebula-preview'],
        });

        const version = await getVersionHelmcharts(pathHelmcharts, octokit);
        const banzaicloud = await hasBanzaicloud(
          pathHelmcharts,
          'values.qa.yaml',
          octokit,
        );

        logger.info(`helmchartsVersion: ${version}`);
        logger.info(`helmchartsIsUsingBanzaicloud: ${banzaicloud}`);
        ctx.output('helmchartsVersion', version);
        ctx.output('helmchartsIsUsingBanzaicloud', banzaicloud);
      } catch (err) {
        ctx.logger.error(err);
        throw err;
      }
    },
  });
};
