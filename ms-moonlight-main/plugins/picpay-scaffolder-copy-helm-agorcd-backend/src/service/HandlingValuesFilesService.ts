import fs from 'fs-extra';
import { Strategy } from '../interface/Strategy';

export class HandlingValuesFilesService {
  protected strategy: Strategy;

  constructor(
    private readonly pathTemporaryServiceName: string,
    strategy: Strategy,
  ) {
    this.strategy = strategy;
  }

  public setStrategy(strategy: Strategy) {
    this.strategy = strategy;
  }

  protected loadValuesFile(fileName: string): string {
    return fs.readFileSync(
      `${this.pathTemporaryServiceName}/${fileName}`,
      'utf8',
    );
  }

  private changeContentValueFiles(): string {
    return `global:\n  image:\n    tag: ${this.strategy.getEnvironmentImageTag()}\n  releaseNumber: 0`;
  }

  private mergeContentValuesFiles(content: string): string {
    return content.replace(/global:/g, this.changeContentValueFiles());
  }

  protected saveNewContent(fileName: string, newContent: string): void {
    fs.writeFile(
      `${this.pathTemporaryServiceName}/${fileName}`,
      newContent,
      'utf8',
    );
  }

  editFile() {
    const file = this.strategy.getFileName();
    const content: string = this.loadValuesFile(file);
    const changeContent = this.mergeContentValuesFiles(content);
    this.saveNewContent(file, changeContent);
  }
}
