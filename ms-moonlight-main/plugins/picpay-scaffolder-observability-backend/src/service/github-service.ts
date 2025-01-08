import { Octokit } from 'octokit';
import { Logger } from 'winston';
import YAML from 'js-yaml';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

type AppTelemetryInfo = {
  language: string;
  telemetry: {
    app: string;
    strategy: string;
  };
};

export class GithubHelper {
  constructor(
    private logger: Logger,
    private integrations: ScmIntegrations,
    private githubCredentialsProvider: GithubCredentialsProvider,
  ) {}

  async getCatalogInfo(repo: string): Promise<any> {
    const credentialProviderToken =
      await this.githubCredentialsProvider?.getCredentials({
        url: `https://github.com/PicPay/${repo}`,
      });

    const octokit = new Octokit({
      ...this.integrations,
      baseUrl: `https://api.github.com`,
      headers: {
        Accept: 'application/vnd.github.machine-man-preview+json',
      },
      auth: credentialProviderToken?.token,
    });

    this.logger.info('Retriving catalog-info file');

    const { data } = await octokit.rest.repos.getContent({
      owner: 'PicPay',
      repo,
      path: 'catalog-info.yaml',
    });

    if (Array.isArray(data)) {
      throw new Error('Invalid data from catalog-info');
    }

    if (!('content' in data)) {
      throw new Error("Response doesn't contains content keyword");
    }

    const content = Buffer.from(data.content, 'base64').toString();
    return JSON.parse(
      JSON.stringify(YAML.loadAll(content, null, { json: true })),
    );
  }

  async getBasicTelemetryInfo(name: string): Promise<AppTelemetryInfo> {
    const catalogData: any[] = await this.getCatalogInfo(name);
    let componentData: any;

    catalogData.forEach(data => {
      if (data?.kind === 'Component') {
        componentData = data;
      }
    });

    if (componentData === null) {
      throw new Error(
        'unable to fetch catalog-info informations, catalog-info.yaml doesnt contain kind Component',
      );
    }

    this.logger.info('componentData', componentData);

    return {
      language: componentData?.metadata?.labels['moonlight.picpay/language'],
      telemetry: {
        app: componentData?.metadata?.labels['moonlight.picpay/monitoring'],
        strategy:
          componentData?.metadata?.labels[
            'moonlight.picpay/monitoring-strategy'
          ],
      },
    };
  }
}
