import fs from 'fs';
import path from 'path';
import { dump } from 'js-yaml';
import { Logger } from 'winston';
import { ContentsRepository } from '../interfaces/request';
import { MergeContentRequestModel } from '../models/request';

export class MergeContentService {
  private readonly logger: Logger;
  private readonly contentsRepo: ContentsRepository;

  constructor(logger: Logger, contentsRepo: ContentsRepository) {
    this.logger = logger;
    this.contentsRepo = contentsRepo;
  }

  async mergeContentAndWriteFile(contentRequest: MergeContentRequestModel) {
    const fileData = await this.contentsRepo.getContent(
      contentRequest.repository,
      contentRequest.filename,
    );
    const updatedFile = this.appendContent(
      fileData.content,
      contentRequest.content,
    );
    const newContent = dump(updatedFile);

    this.logger.info({ outputPath: contentRequest.featureFlagsDirectory });

    this.maybeCreateDirectory(contentRequest.featureFlagsDirectory);
    this.writeFileSync(
      contentRequest.featureFlagsDirectory,
      contentRequest.filename,
      newContent,
    );
  }

  /*
        TODO: Update this function to be more flexible accepting other yaml files and structures,
        today we are focusing on the ".moonlight.yaml" structure, other files that don't have the steps key will break.
    */
  private appendContent(sourceContent: any, content: any): any {
    const steps = sourceContent.steps;
    delete sourceContent.steps;

    for (const [key, value] of Object.entries(content)) {
      sourceContent[key] = value;
    }

    sourceContent.steps = steps;

    return sourceContent;
  }

  private writeFileSync(directory: string, filename: string, content: string) {
    fs.writeFileSync(path.join(directory, filename), content, {
      encoding: 'utf-8',
    });
  }

  private maybeCreateDirectory(directory: string) {
    if (!fs.existsSync(directory)) {
      fs.mkdirSync(directory, { mode: 0o744 });
    }
  }
}
