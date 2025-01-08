import { RepositoryDetails } from '../../interfaces/githubRepository';
import { isThereInLegacyClusters } from './filterIsOnLegacyClusters';

const mockEnvironmentIdsByServiceName = jest
  .fn()
  .mockImplementation(async serviceName => {
    switch (serviceName) {
      case 'ms-with-new-clusters':
        return [
          { name: 'prod', id: 'withNewClustersPRD' },
          { name: 'qa', id: 'withNewClustersQA' },
        ];
      case 'ms-without-new-clusters':
        return [
          { name: 'prod', id: 'withoutNewClustersPRD' },
          { name: 'qa', id: 'withoutNewClustersQA' },
        ];
      default:
        return new Error();
    }
  });

const mockEnvironmentDetailsById = jest.fn().mockImplementation(id => {
  switch (id) {
    case 'withNewClustersPRD':
      return [
        { name: 'k8s-fmktpl-prd', id: 'abc' },
        { name: 'k8s-prod', id: 'def' },
      ];
    case 'withNewClustersQA':
      return [
        { name: 'k8s-fmktpl-qa', id: 'abc' },
        { name: 'k8s-qa', id: 'def' },
      ];
    case 'withoutNewClustersPRD':
      return [{ name: 'k8s-prod', id: 'def' }];
    case 'withoutNewClustersQA':
      return [{ name: 'k8s-qa', id: 'def' }];
    default:
      console.info('There is no configuration available');
      return [];
  }
});

jest.mock('../../repositories/harness', () => {
  return jest.fn().mockImplementation(() => {
    return {
      getEnvironmentIdsBy: mockEnvironmentIdsByServiceName,
      getEnvironmentDetailsBy: mockEnvironmentDetailsById,
    };
  });
});

const withNewClusters: RepositoryDetails = {
  repository: 'ms-with-new-clusters',
  files: [],
  settings: [
    {
      type: 'Repository',
      config: {
        url: 'https://tekton-webhook.prd-hub-virginia.k8s.hub.picpay.cloud/microservices',
      },
    },
  ],
};

const withoutNewClusters: RepositoryDetails = {
  repository: 'ms-without-new-clusters',
  files: [],
  settings: [
    {
      type: 'Repository',
      config: {
        url: 'fake',
      },
    },
  ],
};

describe('#IsThereInLegacyClusters', () => {
  const mockComponents = {
    logger: { info: jest.fn(), error: jest.fn() },
  };

  it('should pass when dont have any new cluster configured', async () => {
    expect(
      await isThereInLegacyClusters(mockComponents, withoutNewClusters),
    ).toBe(undefined);
  });

  it('should throw error when have any new cluster configured', async () => {
    await expect(
      isThereInLegacyClusters(mockComponents, withNewClusters),
    ).rejects.toThrow(
      'There is a new cluster k8s-fmktpl-prd configured, not only msqa/msprod',
    );
  });
});
