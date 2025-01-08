import { Strategy } from '../interface/Strategy';

export class ValuesProdStrategy implements Strategy {
  constructor(
    private tagValue: string,
    private newContent: string = '',
    private fileName: string = 'values.prod.yaml',
    private environment: string = 'prod',
  ) {}

  public setNewContent(content: string): void {
    this.newContent = content;
  }

  public getNewContent(): string {
    return this.newContent;
  }

  public setEnvironmentImageTag(tagValue: string): void {
    this.tagValue = tagValue;
  }

  public getEnvironmentImageTag(): string {
    return this.tagValue;
  }

  public getFileName(): string {
    return this.fileName;
  }

  public getEnvironment(): string {
    return this.environment;
  }
}
