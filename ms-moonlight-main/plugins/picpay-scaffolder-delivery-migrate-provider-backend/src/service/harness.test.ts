import {
  HarnessMigration,
  environmentResolver,
  makeTemplate,
  getFullPath,
} from './harness';

describe('#fullPath', () => {
  it('should get the full path of harness microservice configuration', () => {
    const fullPath = getFullPath('ms-fake-service', 'prod');
    expect(fullPath).toBe(
      'Setup/Applications/ms-fake-service/Environments/prod/Infrastructure Definitions/',
    );
  });
});

describe('#makeTemplate', () => {
  it('should build correctly template', () => {
    const template = makeTemplate('k8s-applfm-prd');
    expect(template).toEqual({
      harnessApiVersion: '1.0',
      type: 'INFRA_DEFINITION',
      cloudProviderType: 'KUBERNETES_CLUSTER',
      deploymentType: 'KUBERNETES',
      infrastructure: [
        {
          type: 'DIRECT_KUBERNETES',
          cloudProviderName: 'k8s-applfm-prd',
          namespace: '${service.name}',
          releaseName: 'release-${infra.kubernetes.infraId}',
        },
      ],
    });
  });
});

describe('#environmentResolver', () => {
  it('should resolve as qa', () => {
    expect(environmentResolver('Homolog')).toBe('qa');
  });

  it('should resolve as prod', () => {
    expect(environmentResolver('Production')).toBe('prd');
  });
});

describe('#HarnessMigration', () => {
  const MockLogger = jest.fn();
  const MockOctokit = jest.fn();
  const MockCatalogApi = jest.fn();

  it('should initialize HarnessMigration with defined properties', () => {
    const harness = new HarnessMigration(
      new MockLogger(),
      new MockOctokit(),
      new MockCatalogApi(),
      '',
    );

    expect(harness.BASE_BRANCH).toEqual('master');
    expect(harness.MAIN_REPOSITORY).toEqual('ops-harness-setup');
    expect(harness.ORGANIZATION).toEqual('PicPay');
    expect(harness).toBeInstanceOf(HarnessMigration);
  });

  it('should build target branch', () => {
    const harness = new HarnessMigration(
      new MockLogger(),
      new MockOctokit(),
      new MockCatalogApi(),
      '',
    );
    const targetBranch = harness.buildTargetBranch('ms-fake-service');
    expect(targetBranch).toEqual('feat/ms-fake-service-cluster-migration');
  });

  it("should not get the cluster's shortname", async () => {
    const clusters: string = 'foobar';
    MockLogger.mockImplementation(() => ({
      debug: jest.fn(),
    }));
    const CatalogApi = jest.fn().mockImplementation(() => ({
      getEntities: jest.fn(() => ({
        items: [],
      })),
    }));
    const catalogApi = new CatalogApi();
    const harness = new HarnessMigration(
      new MockLogger(),
      new MockOctokit(),
      catalogApi,
      '',
    );
    await expect(harness.getShortname(clusters)).rejects.toThrow(
      'Component foobar not found',
    );
  });

  it('should get more than 1 entities', async () => {
    const clusters: string = 'foobar';
    MockLogger.mockImplementation(() => ({
      debug: jest.fn(),
    }));
    const CatalogApi = jest.fn().mockImplementation(() => ({
      getEntities: jest.fn(() => ({
        items: [{}, {}],
      })),
    }));
    const catalogApi = new CatalogApi();
    const harness = new HarnessMigration(
      new MockLogger(),
      new MockOctokit(),
      catalogApi,
      '',
    );
    await expect(harness.getShortname(clusters)).rejects.toThrow(
      'Component foobar not found or more than one entity were found.',
    );
  });

  it("should get the cluster's shortname", async () => {
    const clusters: string = 'k8s-foobar-prd';
    const CatalogApi = jest.fn().mockImplementation(() => ({
      getEntities: jest.fn(() => ({
        items: [
          { metadata: { labels: { 'moonlight.picpay/short-name': 'foobar' } } },
        ],
      })),
    }));
    const catalogApi = new CatalogApi();
    const harness = new HarnessMigration(
      new MockLogger(),
      new MockOctokit(),
      catalogApi,
      '',
    );
    const shortname = await harness.getShortname(clusters);
    expect(shortname).toEqual('foobar');
    expect(catalogApi.getEntities).toHaveBeenCalledWith({
      filter: { kind: 'Resource', 'metadata.name': 'k8s-foobar-prd' },
    });
  });

  it('should delete all files from directory', async () => {
    const Logger = jest.fn().mockImplementation(() => ({
      info: jest.fn(),
    }));
    const logger = new Logger();
    const harness = new HarnessMigration(
      logger,
      new MockOctokit(),
      new MockCatalogApi(),
      '',
    );
    const treeItems: any[] = [];
    const sourcePath: string = 'Setup/Applications/warcraft';
    const currentTree: any = {
      tree: [
        { type: 'tree', path: 'Setup/Applications/xpto/blable.yaml' },
        { type: 'blob', path: 'Setup/Applications/warcraft/foobar.yaml' },
        { type: 'blob', path: 'Setup/Applications/starcraft/foobar.yaml' },
      ],
    };

    harness.deleteAllFilesInPath(treeItems, sourcePath, currentTree);
    expect(treeItems).toEqual([
      {
        type: 'blob',
        sha: null,
        path: 'Setup/Applications/warcraft/foobar.yaml',
      },
    ]);
  });
});
