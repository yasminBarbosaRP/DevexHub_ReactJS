import * as winston from 'winston';
import {
  hasArgoRolloutsProvisioner,
  inspectForRolloutsNodepool,
  argoRolloutChecksNodepool,
} from './nodepool-cluster-config';
import yaml from 'js-yaml';

jest.mock('./nodepool-cluster-config', () => ({
  ...jest.requireActual('./nodepool-cluster-config'),
  nodepoolClusterConfig: jest.fn(),
}));

describe('nodepool-cluster-config', () => {
  let logger: winston.Logger;
  const Octokit = jest.fn().mockImplementation(() => {
    return {
      rest: {
        repos: {
          getContent: jest.fn(),
          getBranch: jest.fn(),
          createOrUpdateFileContents: jest.fn(),
        },
        git: {
          createRef: jest.fn(),
        },
        pulls: {
          create: jest.fn(),
        }
      },
      request: jest.fn(),
    };
  });

  beforeEach(() => {
    jest.resetModules();
    logger = winston.createLogger({
      transports: [new winston.transports.Console()],
    });
    // @ts-ignore
    require('./nodepool-cluster-config').nodepoolClusterConfig.mockReset();
  });

  describe('hasArgoRolloutsProvisioner', () => {
    it('should return true if argo-rollouts provisioner exists', () => {
      const yamlContent = yaml.load(`
        karpenter-provisioners:
          Provisioners:
            - name: argo-rollouts`);
      expect(hasArgoRolloutsProvisioner(yamlContent)).toBe(true);
    });

    it('should return false if argo-rollouts provisioner does not exist', () => {
      const yamlContent = yaml.load(`
        karpenter-provisioners:
          Provisioners:
            - name: other-provisioner`);
      expect(hasArgoRolloutsProvisioner(yamlContent)).toBe(false);
    });

    it('should return false if karpenter-provisioners does not exist', () => {
      const yamlContent = yaml.load(`{}`);
      expect(hasArgoRolloutsProvisioner(yamlContent)).toBe(false);
    });
  });

  describe('inspectForRolloutsNodepool', () => {
    it('should return false and original content if argo-rollouts provisioner exists', () => {
      const clusterKarpenterConfig = `
        karpenter-provisioners:
          Provisioners:
            - name: argo-rollouts
      `;
      const [needToAdd, updatedContent] = inspectForRolloutsNodepool(clusterKarpenterConfig, logger);
      expect(needToAdd).toBe(false);
      expect(updatedContent).toBe(clusterKarpenterConfig);
    });

    it('should return true and updated content if argo-rollouts provisioner does not exist', () => {
      const clusterKarpenterConfig = `
        karpenter-provisioners:
          Provisioners:
            - name: other-provisioner
      `;
      const [needToAdd, updatedContent] = inspectForRolloutsNodepool(clusterKarpenterConfig, logger);
      expect(needToAdd).toBe(true);
      const parsedYaml = yaml.load(updatedContent);
      // @ts-ignore
      expect(parsedYaml['karpenter-provisioners'].Provisioners).toContainEqual({ name: 'argo-rollouts' });
    });
  });

  describe('argoRolloutChecksNodepool', () => {
    it('should return outputArray if Argo Rollouts Nodepool is already added or can\'t be configured', async () => {
      const octokit = new Octokit();
      // @ts-ignore
      require('./nodepool-cluster-config').nodepoolClusterConfig.mockResolvedValueOnce([false, '']);
      const outputArray = await argoRolloutChecksNodepool(logger, octokit, 'repo', 'path', []);
      expect(outputArray.length).toEqual(0);
    });
  });
});
