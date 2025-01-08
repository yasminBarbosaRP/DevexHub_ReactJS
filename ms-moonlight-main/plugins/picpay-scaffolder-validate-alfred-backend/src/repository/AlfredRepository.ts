import { UrlReader } from '@backstage/backend-common';
import { NotFoundError } from '@backstage/errors';
import { ScmIntegrations } from '@backstage/integration';
import { fetchContents } from '@backstage/plugin-scaffolder-node';
import * as fs from 'fs-extra';
import { ContentRepository, ErrorInfo } from '../interfaces/AlfredRepository';

enum FileType {
  Dir = 'dir',
  File = 'file',
}

export class AlfredRepository {
  private repository: string;
  private workDir: string;
  private reader: UrlReader;
  private integrations: ScmIntegrations;
  private baseUrl: string;
  private githubUrl: string = 'https://github.com/PicPay';

  public constructor(options: {
    repository: string;
    workDir: string;
    reader: UrlReader;
    integrations: ScmIntegrations;
    baseUrl: string;
  }) {
    this.repository = options.repository;
    this.workDir = options.workDir;
    this.reader = options.reader;
    this.integrations = options.integrations;
    this.baseUrl = options.baseUrl;
  }

  async getRepository(): Promise<void> {
    await fetchContents({
      reader: this.reader,
      integrations: this.integrations,
      baseUrl: this.baseUrl,
      fetchUrl: `${this.githubUrl}/${this.repository}`,
      outputPath: this.workDir,
    });
  }

  async validateFileStructure(
    contentRepository: ContentRepository,
  ): Promise<ErrorInfo[]> {
    const { mainPath, content, throwError } = contentRepository;
    const errors: ErrorInfo[] = [];

    content.forEach(({ path, structure }) => {
      const basePath = `${this.workDir}/${mainPath}/${path ?? ''}`;

      if (!fs.pathExistsSync(basePath)) {
        errors.push({
          type: FileType.Dir,
          path: `${path ?? mainPath}`,
          message: `Directory not found: ${path ?? mainPath}`,
        });
      }

      structure.forEach(({ type, name }) => {
        name.forEach(value => {
          const nameFolderFile = `${path ?? mainPath}/${value}`;
          const fullPath = `${basePath}/${value}`;

          if (this.validateType(fullPath, type)) {
            errors.push({
              type,
              path: nameFolderFile,
              message: `${
                type === 'dir' ? 'Directory' : 'File'
              } not found: ${nameFolderFile}`,
            });
          }
        });
      });
    });

    this.messageError(errors, throwError);

    return errors;
  }

  private validateType(fullPath: string, type: string) {
    return (
      (type === FileType.Dir && !fs.existsSync(fullPath)) ||
      (type === FileType.File && !fs.existsSync(fullPath))
    );
  }

  private messageError(errors: ErrorInfo[], throwError?: boolean): void {
    if (throwError && errors.length > 0) {
      errors.forEach(error => {
        throw new NotFoundError(`${error.message}`);
      });
    }
  }
}
