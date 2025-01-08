import { ArgoCDMigration, environmentResolver, getFileContent } from './argocd';

describe('#ArgoCDMigration', () => {
  it('should initialize with default parameters', () => {
    const Logger = jest.fn();
    const Octokit = jest.fn();
    const argocd = new ArgoCDMigration(new Logger(), new Octokit(), '');

    expect(argocd).toBeInstanceOf(ArgoCDMigration);
    expect(argocd.ORG).toEqual('PicPay');
    expect(argocd.REPOSITORY).toEqual('gitops-moonlight-pipelines');
    expect(argocd.BASE_BRANCH).toEqual('main');
    expect(argocd.defaultPath).toEqual('apps');
    expect(argocd.defaultFilename).toEqual('config.json');
  });

  it('should build target branch', () => {
    const Logger = jest.fn();
    const Octokit = jest.fn();
    const argocd = new ArgoCDMigration(new Logger(), new Octokit(), '');

    expect(argocd.buildTargetBranch('ms-fake-service')).toEqual(
      'feat/ms-fake-service-cluster-migration',
    );
  });
});

describe('#getFileContent', () => {
  it('should get filecontent from a repository', async () => {
    const Org = 'PicPay';
    const repository = 'gitops-moonlight-pipelines';
    const path = 'apps/ms-fake-service/apps/config.json';
    const content = 'Zm9vYmFyCg==';
    const Octokit = jest.fn().mockImplementation(() => ({
      request: jest.fn().mockResolvedValue({ data: { path, content } }),
    }));
    const githubApi = new Octokit();

    const response = await getFileContent(githubApi, Org, repository, path);
    expect(githubApi.request).toHaveBeenCalledWith(
      'GET /repos/PicPay/gitops-moonlight-pipelines/contents/apps/ms-fake-service/apps/config.json',
      {
        owner: 'PicPay',
        path: 'apps/ms-fake-service/apps/config.json',
        repo: 'gitops-moonlight-pipelines',
      },
    );
    expect(response).toEqual({ path, content });
  });
});

describe('#environmentResolver', () => {
  it('should retrieve the Production environment correctly', () => {
    const cluster = 'Production';
    const environment = environmentResolver(cluster);
    expect(environment).toEqual('prd');
  });

  it('should retrieve the Homolog environment correctly', () => {
    const cluster = 'Homolog';
    const environment = environmentResolver(cluster);
    expect(environment).toEqual('hom');
  });

  it('should not retrieve a valid environmen', () => {
    const cluster = 'foobar';
    expect(() => environmentResolver(cluster)).toThrow(
      'Environment not found for cluster foobar',
    );
  });
});
