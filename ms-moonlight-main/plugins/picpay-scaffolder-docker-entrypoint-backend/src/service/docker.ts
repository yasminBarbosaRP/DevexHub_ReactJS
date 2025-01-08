import { NotFoundError } from '@backstage/errors';
import * as winston from 'winston';
import { TreeItem } from '../interfaces/github';
import GithubUseCase from './github';

export class DockerUseCase {
  private dockerFileInformation = [
    'COPY docker-entrypoint.sh {{WORKDIR}}',
    'RUN chmod +x {{WORKDIR}}/docker-entrypoint.sh',
    'ENTRYPOINT {{WORKDIR}}/docker-entrypoint.sh',
  ];

  private dockerEntrypointAtLeastHave = [
    'source /vault/secrets/bu-env',
    'source /vault/secrets/global-env',
  ];

  private dockerEntryPointInformation = [
    '#!/bin/sh',
    'set -e',
    '# Executes the file with export that Vault injected',
    ...this.dockerEntrypointAtLeastHave,
    'exec $@',
  ];

  constructor(
    private readonly logger: winston.Logger,
    private readonly gitService: GithubUseCase,
  ) {}

  async ensureDockerFileFormat(
    tree: TreeItem | undefined,
    repo: string,
  ): Promise<{
    result: string;
    conditionsMet: boolean;
    originalValue: string;
  }> {
    if (!tree || !tree.sha)
      throw new NotFoundError(
        'Unable to find Dockerfile inside the repository',
      );

    let fileContent = await this.gitService.getFileContentFromSHA(
      repo,
      tree.sha,
    );
    if (fileContent.includes('docker-entrypoint.sh'))
      return Promise.resolve({
        result: fileContent,
        conditionsMet: true,
        originalValue: fileContent,
      });
    const originalValue = fileContent;

    let workdir = '/';
    const splittedFile = fileContent.split('\n');
    const startPoint = splittedFile.findIndex(
      e => e.includes('ENTRYPOINT') || e.includes('CMD'),
    );
    for (let i = startPoint; i >= 0; i--) {
      if (splittedFile[i].includes('WORKDIR')) {
        workdir = splittedFile[i].replace('WORKDIR', '').trim();
        if (workdir.endsWith('/'))
          workdir = workdir.slice(0, workdir.length - 1);
        break;
      }
    }

    if (fileContent.includes('ENTRYPOINT')) {
      fileContent = fileContent.replace('ENTRYPOINT', 'CMD');
    }

    return Promise.resolve({
      result: fileContent.replace(
        'CMD',
        `\n${this.dockerFileInformation
          .join('\n')
          .replaceAll('{{WORKDIR}}', workdir)}\nCMD`,
      ),
      conditionsMet: false,
      originalValue,
    });
  }

  async ensureDockerEntrypointFormat(
    tree: TreeItem | undefined,
    repo: string,
  ): Promise<{ result: string; conditionsMet: boolean }> {
    if (!tree || !tree.sha) {
      this.logger.info(
        `conditions for docker-file doesnt met, generating whole file...`,
      );
      return Promise.resolve({
        result: this.dockerEntryPointInformation.join('\n'),
        conditionsMet: false,
      });
    }

    const fileContent = await this.gitService.getFileContentFromSHA(
      repo,
      tree.sha,
    );
    let conditionsMet = true;

    for (const line of this.dockerEntrypointAtLeastHave) {
      if (!fileContent.includes(line)) {
        conditionsMet = false;
        break;
      }
    }

    if (conditionsMet)
      return Promise.resolve({ result: fileContent, conditionsMet: true });

    return Promise.resolve({
      result: fileContent.replace(
        'set -e',
        `set -e\n${this.dockerEntrypointAtLeastHave.join('\n')}\n`,
      ),
      conditionsMet: false,
    });
  }
}
