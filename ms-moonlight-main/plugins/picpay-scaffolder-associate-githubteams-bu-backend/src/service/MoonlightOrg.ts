import path from 'path';
import YAML, { dump } from 'js-yaml';
import {
  decode,
  sanitizeDirectoryBuNameFile,
} from '@internal/plugin-picpay-core-components';
import { MoonlightOrgYaml } from '../model/MoonlighOrgYaml';
import fs from 'fs-extra';
import Github from '../interfaces/Github';
import { Content } from '../model/Content';

export type MoonlightOrgOptions = {
  bu: string;
  team: string;
  pathRepo: string;
  pathTemp: string;
  owner: string;
  repository: string;
  github: Github;
};

export default class MoonlightOrg {
  constructor(
    private options: MoonlightOrgOptions,
    private pushToBranch: boolean = false,
  ) {}

  public async getContent(): Promise<MoonlightOrgYaml> {
    const data: Content = await this.options.github.getContents(
      `${this.options.pathRepo}/${sanitizeDirectoryBuNameFile(
        this.options.bu,
      )}-bu.yaml`,
    );

    return JSON.parse(JSON.stringify(YAML.load(decode(data.content))));
  }

  public saveContent(content: string): void {
    const directory = path.join(
      this.options.pathTemp,
      'picpay',
      this.options.bu,
    );

    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(
      path.join(
        directory,
        `${sanitizeDirectoryBuNameFile(this.options.bu)}-bu.yaml`,
      ),
      content,
      { encoding: 'utf-8' },
    );
  }

  public async changeContent(content: MoonlightOrgYaml): Promise<void> {
    if (content.spec.children.includes(this.options.team)) {
      return;
    }

    content.spec.children.push(this.options.team);
    const newContent = dump(content);
    this.saveContent(newContent);
    this.pushToBranch = true;
  }

  public async push(): Promise<void> {
    if (!this.pushToBranch) {
      return;
    }

    const file = path.join(
      'picpay',
      this.options.bu,
      `${sanitizeDirectoryBuNameFile(this.options.bu)}-bu.yaml`,
    );

    await this.options.github.pushFileToBranch(
      this.options.bu,
      this.options.owner,
      this.options.repository,
      this.options.pathTemp,
      file,
    );
  }
}
