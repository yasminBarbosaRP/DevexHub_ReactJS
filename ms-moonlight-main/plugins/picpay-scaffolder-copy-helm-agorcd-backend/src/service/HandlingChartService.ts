import fs from 'fs-extra';
import YAML, { dump } from 'js-yaml';
import { Chart } from '../model/Chart';

export class HandlingChartService {
  private readonly fileName: string = 'Chart.yaml';
  private readonly dependencyRepoUrl: string =
    'https://chartmuseum.prd-hub-virginia.k8s.hub.picpay.cloud';

  constructor(private readonly pathTemporaryServiceName: string) {}

  private loadChart(): Chart {
    return JSON.parse(
      JSON.stringify(
        YAML.load(
          fs.readFileSync(
            `${this.pathTemporaryServiceName}/${this.fileName}`,
            'utf8',
          ),
        ),
      ),
    );
  }

  private changeRepositoryUrl(content: Chart): string {
    content.dependencies[0].repository = this.dependencyRepoUrl;
    return dump(content);
  }

  private saveNewContent(newContent: string): void {
    void fs.writeFile(
      `${this.pathTemporaryServiceName}/${this.fileName}`,
      newContent,
      'utf8',
    );
  }

  edit() {
    const content: Chart = this.loadChart();
    const changeContent = this.changeRepositoryUrl(content);
    this.saveNewContent(changeContent);
  }
}
