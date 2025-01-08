import { ClusterDiscovery } from './clusterDiscovery';

describe('#clusterDiscovery', () => {
  it('should initialize of ClusterDiscovery', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    expect(clusterDiscovery).toBeInstanceOf(ClusterDiscovery);
  });

  it('should get cluster by environment successfully as object', async () => {
    const GithubRepository = jest.fn().mockImplementation(() => ({
      getContents: jest.fn().mockImplementation((_1, _2, arg3) => {
        if (arg3.includes('qa')) {
          return {
            name: 'k8s-prod',
            path: 'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions/k8s-prod',
            content: 'foobar',
          };
        }

        return {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        };
      }),
    }));
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const clusters = await clusterDiscovery.getClusterByEnvironment(
      'ms-foobar',
    );

    expect(githubRepository.getContents).toHaveBeenCalledWith(
      'PicPay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions',
    );
    expect(githubRepository.getContents).toHaveBeenCalledWith(
      'PicPay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions',
    );
    expect(clusters).toEqual({
      prod: [
        {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        },
      ],
      qa: [
        {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        },
      ],
    });
  });

  it('should get cluster by environment successfully as array', async () => {
    const GithubRepository = jest.fn().mockImplementation(() => ({
      getContents: jest.fn().mockImplementation((_1, _2, arg3) => {
        if (arg3.includes('qa')) {
          return [
            {
              name: 'k8s-qa',
              path: 'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions/k8s-qa',
              content: 'foobar',
            },
          ];
        }

        return [
          {
            name: 'k8s-prod',
            path: 'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions/k8s-prod',
            content: 'foobar',
          },
        ];
      }),
    }));
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const clusters = await clusterDiscovery.getClusterByEnvironment(
      'ms-foobar',
    );

    expect(githubRepository.getContents).toHaveBeenCalledWith(
      'PicPay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions',
    );
    expect(githubRepository.getContents).toHaveBeenCalledWith(
      'PicPay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions',
    );
    expect(clusters).toEqual({
      prod: [
        {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        },
      ],
      qa: [
        {
          name: 'k8s-qa',
          path: 'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions/k8s-qa',
          content: 'foobar',
        },
      ],
    });
  });

  it('should discover cluster successfully', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const inputs = [
      {
        clusterName: 'k8s-qa.yaml',
        expected: 'picpay-ops-ms-00',
      },
      {
        clusterName: 'k8s-prod.yaml',
        expected: 'picpay-ops-msprod-00',
      },
      {
        clusterName: 'k8s-applfm-qa.yaml',
        expected: 'eks-applfm-use1-hom',
      },
      {
        clusterName: 'k8s-applfm-prod.yaml',
        expected: 'eks-applfm-use1-prd',
      },
      {
        clusterName: 'k8s-applfm-hom.yaml',
        expected: 'eks-applfm-use1-hom',
      },
      {
        clusterName: 'k8s-applfm-prd.yaml',
        expected: 'eks-applfm-use1-prd',
      },
    ];

    for (const input of inputs) {
      const cluster = clusterDiscovery.discoverCluster(input.clusterName);
      expect(cluster).toEqual(input.expected);
    }
  });

  it('should not discover cluster when the name is wrong', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    expect(() => clusterDiscovery.discoverCluster('foobar.yaml')).toThrow(
      'The cluster name was not found',
    );
  });

  it('should discover cluster', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);
    const mockResponse = {
      prod: [
        {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-foobar/Environments/prod/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        },
      ],
      qa: [
        {
          name: 'k8s-qa',
          path: 'Setup/Applications/ms-foobar/Environments/qa/Infrastructure Definitions/k8s-qa',
          content: 'foobar',
        },
      ],
    };

    const clusters = clusterDiscovery.discover(mockResponse);
    expect(clusters).toEqual({
      hom: 'picpay-ops-ms-00',
      prd: 'picpay-ops-msprod-00',
    });
  });

  it('should check that there are no clusters for specific environment', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const clusters = {
      qa: [],
      prod: [{ name: 'k8s-prod' }],
    };

    expect(() => clusterDiscovery.discover(clusters)).toThrow(
      'There is no cluster configured for the qa environment.',
    );
  });

  it('should be ignore legacy cluster and continue', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const clustersMock = {
      prod: [
        {
          name: 'k8s-prod',
          path: 'Setup/Applications/ms-conciliation-engine/Environments/prod/Infrastructure Definitions/k8s-prod',
          content: 'foobar',
        },
        {
          name: 'k8s-infcrp-prd',
          path: 'Setup/Applications/ms-conciliation-engine/Environments/prod/Infrastructure Definitions/kk8s-infcrp-prd',
          content: 'foobar',
        },
      ],
      qa: [
        {
          name: 'k8s-qa',
          path: 'Setup/Applications/ms-conciliation-engine/Environments/qa/Infrastructure Definitions/k8s-qa',
          content: 'foobar',
        },
      ],
    };

    const clusters = clusterDiscovery.discover(clustersMock);
    expect(clusters).toEqual({
      prd: 'eks-infcrp-use1-prd',
      hom: 'picpay-ops-ms-00',
    });
  });

  it('should verify configs for "qa" or "prod"', () => {
    const GithubRepository = jest.fn();
    const githubRepository = new GithubRepository();
    const clusterDiscovery = new ClusterDiscovery(githubRepository);

    const clusters = {
      hom: [{ name: 'k8s-qa' }],
      prd: [{ name: 'k8s-prod' }],
    };

    expect(() => clusterDiscovery.discover(clusters)).toThrow(
      "There isn't config with environment 'qa' or 'prod'.",
    );
  });
});
