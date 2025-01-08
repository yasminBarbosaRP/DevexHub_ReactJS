import {
  ActionContext,
  fetchContents,
} from '@backstage/plugin-scaffolder-node';
import { resolveSafeChildPath, UrlReader } from '@backstage/backend-common';
import { ScmIntegrations } from '@backstage/integration';
import globby from 'globby';
import fs from 'fs-extra';
import { HelmchartsOptions } from '../model/Helmcharts';

export class HelmchartsRepository {
  private readonly reader: UrlReader;
  private readonly integrations: ScmIntegrations;
  private readonly chartUrl: string =
    'https://github.com/PicPay/helm-charts/tree/master';
  private readonly context: ActionContext<{}>;
  private readonly repository: string;

  constructor(options: HelmchartsOptions) {
    this.reader = options.reader;
    this.integrations = options.integrations;
    this.context = options.context;
    this.repository = options.repository;
  }

  public get directoryArgoCd(): string {
    return resolveSafeChildPath(
      this.context.workspacePath,
      `./argocd/${this.repository}/chart`,
    );
  }

  public async downloadHelmchats(): Promise<void> {
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

    const regex = /^(picpay-dev-)/;
    const repochanged = this.repository.replace(regex, '');

    const cwd: string = `${tempHelmchartsDir}/services/${repochanged}/`;
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

    for await (const contents of allEntriesOnRepo) {
      this.context.logger.info(`Copy ${contents}`);

      fs.moveSync(
        resolveSafeChildPath(cwd, contents),
        resolveSafeChildPath(this.directoryArgoCd, contents),
        { overwrite: true },
      );
    }
  }
}
