import { Strategy } from '../interface/Strategy';

export class ValuesQaStrategy implements Strategy {
  constructor(
    private tagValue: string,
    private fileName: string = 'values.qa.yaml',
    private environment: string = 'qa',
  ) {}

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
