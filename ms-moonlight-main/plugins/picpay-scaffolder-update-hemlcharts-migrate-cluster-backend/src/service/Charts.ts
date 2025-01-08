import {
  Chart,
  Dependencies,
} from '@internal/plugin-picpay-scaffolder-copy-helm-agorcd-backend';
import fs from 'fs-extra';
import { dump } from 'js-yaml';

const VERSION_HELMCHARTS = '>=0.53.0';
const VERSION_HELMCHARTS_FLOAT = 0.53;
const VERSION_HELMCHARTS_V2 = '1.6.4';
const VERSION_HELMCHARTS_V2_FLOAT = 1.6;
const CHARTMUSEUM_URL =
  'https://chartmuseum.prd-hub-virginia.k8s.hub.picpay.cloud';

export class Charts {
  private readonly fileName: string = 'Chart.yaml';

  constructor(
    private readonly pathTemporaryServiceName: string,
    private readonly content: Chart,
    private readonly environments: Array<string>,
    private readonly segregateChartsByEnvironment: boolean = false,
  ) {}

  private changeContent(
    content: Chart,
    versionCompare: number,
    versionSet: string,
  ): string {
    const alreadySegregatedByEnvironment = content.dependencies.length > 1;
    if (!alreadySegregatedByEnvironment && this.segregateChartsByEnvironment) {
      content.dependencies.push({ ...content.dependencies[0] });
      content.dependencies[0].name += '-qa'; // -qa will always be the first dependency
    }

    const updateDependencyVersion = (dependency: Dependencies) => {
      const chartAsFloat = parseFloat(
        dependency.version.replace(new RegExp(/[^0-9\.]/, 'g'), ''),
      );
      if (chartAsFloat < versionCompare) {
        dependency.version = versionSet;
      }
    };

    if (this.segregateChartsByEnvironment) {
      this.environments.forEach(environment => {
        const indexOfEnvironment = environment === 'qa' ? 0 : 1;
        updateDependencyVersion(content.dependencies[indexOfEnvironment]);
      });
    } else {
      updateDependencyVersion(content.dependencies[0]);
    }

    content.dependencies.forEach(dependency => {
      dependency.repository = CHARTMUSEUM_URL;
    });

    return dump(content);
  }

  private saveNewContent(newContent: string): void {
    fs.writeFile(
      `${this.pathTemporaryServiceName}/${this.fileName}`,
      newContent,
      'utf8',
    );
  }

  private validateVersion(content: Chart): string {
    return content.dependencies[0].name.replaceAll('-', '');
  }

  public edit(): void {
    const _this = this;

    const version: any = {
      picpayms() {
        _this.v1();
      },
      picpaymsv2() {
        _this.v2();
      },
    };

    const runVersion = version[this.validateVersion(this.content)];

    if (runVersion) {
      runVersion();
    }
  }

  private v1(): void {
    const changeContent = this.changeContent(
      this.content,
      VERSION_HELMCHARTS_FLOAT,
      VERSION_HELMCHARTS,
    );
    this.saveNewContent(changeContent);
  }

  private v2(): void {
    const changeContent = this.changeContent(
      this.content,
      VERSION_HELMCHARTS_V2_FLOAT,
      VERSION_HELMCHARTS_V2,
    );
    this.saveNewContent(changeContent);
  }
}
