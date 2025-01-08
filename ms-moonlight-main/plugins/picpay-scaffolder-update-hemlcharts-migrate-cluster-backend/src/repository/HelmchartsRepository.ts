import {
  ActionContext,
  fetchContents,
} from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath, UrlReader } from '@backstage/backend-common';
import { ScmIntegrations } from '@backstage/integration';
import { HelmchartsOptions } from '@internal/plugin-picpay-scaffolder-copy-helm-agorcd-backend';
import { DeployType } from '@internal/plugin-picpay-scaffolder-identify-cd-backend';
import globby from 'globby';

export class HelmchartsRepository {
  private readonly reader: UrlReader;
  private readonly integrations: ScmIntegrations;
  private readonly chartUrl?: string;
  private readonly context: ActionContext<{}>;
  private readonly repository: string;

  constructor(
    options: HelmchartsOptions,
    private readonly deployType: string,
  ) {
    this.reader = options.reader;
    this.integrations = options.integrations;
    this.context = options.context;
    this.repository = options.repository;
    this.chartUrl = options.chartUrl;
  }

  public async run() {
    if (this.deployType === DeployType.ARGOCD) {
      await this.getFilesArgocd();
      return;
    }

    await this.getFilesHarness();
  }

  public async getFilesHarness(): Promise<void> {
    this.context.logger.info('Fetching Helmcharts');
    const tempHelmchartsDir = resolveSafeChildPath(
      this.context.workspacePath,
      `./helmcharts`,
    );

    await fetchContents({
      reader: this.reader,
      integrations: this.integrations,
      baseUrl: this.context.templateInfo?.baseUrl,
      fetchUrl: `${this.chartUrl}`,
      outputPath: tempHelmchartsDir,
    });

    this.context.logger.info('Listing files and directories Helmcharts');
    this.context.logger.info(`Repository Name ${this.repository}`);
    const cwd: string = `${tempHelmchartsDir}/services/${this.repository}/`;
    const allEntriesOnRepo = await globby(`**/*`, {
      cwd,
      dot: true,
      onlyFiles: true,
      markDirectories: true,
      followSymbolicLinks: false,
    });

    this.context.logger.info(
      `Total files and directories: ${allEntriesOnRepo?.length}`,
    );
  }

  public async getFilesArgocd(): Promise<void> {
    this.context.logger.info('Fetching Repo Infra');
    const tempInfraDir = resolveSafeChildPath(
      this.context.workspacePath,
      `./${this.repository}`,
    );
    await fetchContents({
      reader: this.reader,
      integrations: this.integrations,
      baseUrl: this.context.templateInfo?.baseUrl,
      fetchUrl: `${this.chartUrl}`,
      outputPath: tempInfraDir,
    });

    this.context.logger.info('Listing files and directories Helmcharts');
    this.context.logger.info(`Repository Name ${this.repository}`);
    const cwd: string = `${tempInfraDir}/`;
    const allEntriesOnRepo = await globby(`**/*`, {
      cwd,
      dot: true,
      onlyFiles: true,
      markDirectories: true,
      followSymbolicLinks: false,
    });

    this.context.logger.info(
      `Total files and directories: ${allEntriesOnRepo?.length}`,
    );
  }
}
