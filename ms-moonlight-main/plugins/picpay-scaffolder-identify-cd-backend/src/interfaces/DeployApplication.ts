export default interface DeployApplication {
  hasApplication(): Promise<string>;
}
