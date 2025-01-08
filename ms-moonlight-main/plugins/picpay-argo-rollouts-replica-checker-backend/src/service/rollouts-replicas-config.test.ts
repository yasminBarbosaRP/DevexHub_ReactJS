import * as winston from 'winston';
import yaml from 'js-yaml';
import * as config from './rollouts-replicas-config';

jest.mock('./github-push-to-branch-service');
jest.mock('@octokit/rest');

describe('rollouts-replicas-config', () => {
  let logger: winston.Logger;








  beforeEach(() => {
    logger = winston.createLogger({
      transports: [new winston.transports.Console()],
    });
  });

  describe('inspectForRolloutsReplicas', () => {
    it('should set replicas to 1 if replicas is 0', () => {
      const yamlData = `
      argo-rollouts:
        controller:
          replicas: 0
      `;
      const [error, needToSetReplicas, updatedValuesContent] = config.inspectForRolloutsReplicas(yamlData, logger);

      expect(error).toBe(false);
      expect(needToSetReplicas).toBe(true);
      expect(yaml.load(updatedValuesContent)).toEqual({ 'argo-rollouts': { controller: { replicas: 1 } } });
    });

    it('should not change replicas if replicas is not 0', () => {
      const yamlData = `
      argo-rollouts:
        controller:
          replicas: 2
      `;
      const [error, needToSetReplicas, updatedValuesContent] = config.inspectForRolloutsReplicas(yamlData, logger);

      expect(error).toBe(false);
      expect(needToSetReplicas).toBe(false);
      expect(yaml.load(updatedValuesContent)).toEqual({ 'argo-rollouts': { controller: { replicas: 2 } } });
    });
  });


  it('should fetch content and inspect for rollouts replicas', async () => {
    const yamlData = `
      argo-rollouts:
        controller:
          replicas: 0
      `;
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn().mockResolvedValue({
              status: 200,
              data: {
                content: Buffer.from(yamlData).toString('base64'),
              },
            }),
          },
        },
      } as any;
    });
    const octokit = new Octokit();
    const [error, needToSetReplicas, updatedValuesContent] = await config.rolloutsReplicasConfig(
      logger,
      octokit,
      'test-repo',
      'path/to/file.yaml',
    );

    expect(error).toBe(false);
    expect(needToSetReplicas).toBe(true);
    expect(yaml.load(updatedValuesContent)).toEqual({ 'argo-rollouts': { controller: { replicas: 1 } } });
  });

  it('should handle error when fetching content', async () => {

    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn().mockImplementation(() => {
              throw new Error('Mocked error: File not found');
            }),
          },
        },
      } as any;
    });

    const octokit = new Octokit();
    const [error, needToSetReplicas, updatedValuesContent] = await config.rolloutsReplicasConfig(
      logger,
      octokit,
      'test-repo',
      'path/to/file.yaml',
    );

    expect(error).toBe(true);
    expect(needToSetReplicas).toBe(false);
    expect(updatedValuesContent).toBe('');
  });

  it('should retur argo not found on rolloutsReplicasConfig error', async () => {

    jest.mock('./rollouts-replicas-config', () => ({
      ...jest.requireActual('./rollouts-replicas-config'),
      rolloutsReplicasConfig: jest.fn().mockResolvedValue([true, false, 'mocked content']),
    }));

    const OctokitTest = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn().mockImplementation(() => {
              throw new Error('Mocked error: File not found');
            }),
          },
        },
      } as any;
    });
    const outputArray: [string][] = [];
    const octokit = new OctokitTest();

    const result = await config.argoRolloutChecksReplicas(
      logger,
      octokit,
      'test-repo',
      'path/to/file.yaml',
      outputArray,
    );

    expect(result).toEqual([[`Argo-rollouts não encontrado no repositório de infra do cluster, favor solicitar instalação pelo canal #suporte-developer-experience`,]]);

    // Restore the original implementation
    jest.resetModules();
  });
});
