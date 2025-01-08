export class RolloutsConfig {
  constructor(
    public duration: string = '10m',
    public weights: string = '1/20/30/50/100',
    public type: string = 'web',
    public interval: string = '10s',
    public analysisUrl: string = 'http://{{args.canary-service}}:80/health',
    public analysisSuccessCondition: string = 'result == true',
    public timeout: string = '30',
  ) {
  }
}
