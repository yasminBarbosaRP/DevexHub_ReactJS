export interface Strategy {
  setEnvironmentImageTag(tagValue: string): void;
  getEnvironmentImageTag(): string;
  getFileName(): string;
  getEnvironment(): string;
}
