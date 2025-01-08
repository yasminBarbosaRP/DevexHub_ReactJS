import YAML from 'js-yaml';
import {
  GithubRepository,
  decode,
  encode,
} from '@internal/plugin-picpay-core-components';
import { Logger } from 'winston';

const REPOSITORY_MOONLIGHT_TEMPLATES = 'moonlight-templates';
const FILE_MOONLIGHT_TEMPLATES = 'template.yaml';
const BRANCH_MOONLIGHT_TEMPLATES = 'testing';

type MoonlightTemplatesOptions = {
  githubRepository: GithubRepository;
  organization: string;
  repository: string;
  sha: string[];
  logger: Logger;
  listHash?: string[];
}
export class MoonlightTemplatesRepository {
  private readonly githubRepository: GithubRepository;
  private readonly organization: string;
  private readonly repository: string;
  private readonly sha: string[];
  private readonly listHash: string[] = [];
  private readonly logger: Logger;

  public constructor(options: MoonlightTemplatesOptions) {
    this.githubRepository = options.githubRepository;
    this.organization = options.organization;
    this.repository = options.repository;
    this.sha = options.sha;
    this.listHash = options.listHash ?? [];
    this.logger = options.logger;

    this.logger.info('MoonlightTemplatesRepository initialized');
    this.logger.info(`Monitoring Template Repository ${REPOSITORY_MOONLIGHT_TEMPLATES}`);
    this.logger.info(`Monitoring Template File ${FILE_MOONLIGHT_TEMPLATES}`);
    this.logger.info(`Monitoring Template Branch ${BRANCH_MOONLIGHT_TEMPLATES}`);
  }

  async getTemplate(): Promise<{}> {
    this.logger.info('Getting template from Moonlight Templates');
    const { content } = await this.githubRepository.getContent(
      this.organization,
      REPOSITORY_MOONLIGHT_TEMPLATES,
      FILE_MOONLIGHT_TEMPLATES,
      BRANCH_MOONLIGHT_TEMPLATES,
    );

    return JSON.parse(JSON.stringify(YAML.load(decode(content))));
  }

  private validateTemplateSpec(template: any): void {
    this.logger.info('Validating template spec');
    if (template.spec === undefined || template.spec.targets === undefined) {
      throw new Error('spec.target or spec.targets is required');
    }
  }

  private async deleteByRepositoryName(template: any): Promise<string[]> {
    this.logger.info('Deleting by repository name');
    const targets: string[] = template.spec.targets.filter(
      (item: string) => item.match(this.repository) === null
    );

    return targets
  }

  /**
   * Used when requested to change the hash in the catalog component
   * @param template 
   * @param listHashes 
   */
  private async deleteByHashCommit(template: any, listHashes: string[]): Promise<string[]> {
    this.logger.info('Deleting by hash commit');
    if (listHashes.length <= 0) {
      throw new Error('Hash commit is required');
    }

    let position;
    for (let i = 0; i <= listHashes.length; i++) {
      position = template.spec.targets.findIndex((item: string) => item.match(listHashes[i]));
      if (position >= 0) {
        break;
      }
    };

    template.spec.targets.splice(position, 1);
    return template.spec.targets;
  }

  public async changeContent(moonlightTemplate: any, targetsByName: boolean = true): Promise<any> {
    this.logger.info('Changing content');
    this.validateTemplateSpec(moonlightTemplate);
    let targets: string[] = [];

    if (targetsByName) {
      targets = await this.deleteByRepositoryName(moonlightTemplate);
    } else {
      targets = await this.deleteByHashCommit(moonlightTemplate, this.listHash);
    }
    delete moonlightTemplate.spec.targets;

    const newTree: string[] = [];
    this.sha.forEach((item: string) => {
      newTree.push(`https://github.com/PicPay/${this.repository}/tree/${item}/${FILE_MOONLIGHT_TEMPLATES}`);
    });

    moonlightTemplate.spec.targets = [...targets, ...newTree]
    return encode(YAML.dump(moonlightTemplate, { lineWidth: 800 }));
  }

  private async shaFileMoonlightTemplates(): Promise<string> {
    this.logger.info('Getting sha from Moonlight Templates');
    return await this.githubRepository.getShaFromFile(
      this.organization,
      REPOSITORY_MOONLIGHT_TEMPLATES,
      BRANCH_MOONLIGHT_TEMPLATES,
      FILE_MOONLIGHT_TEMPLATES
    );
  }

  public async updateFileMoonlightTemplates(template: string): Promise<void> {
    this.logger?.info('Updating file Moonlight Templates');
    const shaFileMoonlightTemplates = await this.shaFileMoonlightTemplates();

    await this.githubRepository.createOrUpdateFile(
      this.organization,
      REPOSITORY_MOONLIGHT_TEMPLATES,
      BRANCH_MOONLIGHT_TEMPLATES,
      FILE_MOONLIGHT_TEMPLATES,
      template,
      `Update: Adicionando template ${this.repository}`,
      shaFileMoonlightTemplates
    );
  }
}