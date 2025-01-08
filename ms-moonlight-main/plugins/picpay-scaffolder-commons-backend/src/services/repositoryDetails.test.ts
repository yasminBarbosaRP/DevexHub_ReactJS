import { GithubRepositoryService } from './repositoryDetails';

describe('#GithubRepositoryService', () => {
  it('should get file contents', async () => {
    const GithubRepository = jest.fn().mockImplementation(() => {
      return {
        getContent: jest.fn().mockImplementation(() => {
          return {
            content: 'foobar',
          };
        }),
      };
    });
    const repo = new GithubRepository();
    const githubSvc = new GithubRepositoryService(repo);
    const content = await githubSvc.getFileContents(
      'PicPay',
      'ms-fake-service',
      'README.md',
    );

    expect(content).toEqual('foobar');
    expect(repo.getContent).toHaveBeenCalledWith(
      'PicPay',
      'ms-fake-service',
      'README.md',
    );
  });

  it('should get file contents with error and throw exception', async () => {
    const GithubRepository = jest.fn().mockImplementation(() => {
      return {
        getContent: jest.fn().mockImplementation(() => {
          return {};
        }),
      };
    });
    const repo = new GithubRepository();
    const githubSvc = new GithubRepositoryService(repo);

    await expect(
      githubSvc.getFileContents('PicPay', 'ms-fake-service', 'README.md'),
    ).rejects.toThrow('File is empty');
    expect(repo.getContent).toHaveBeenCalledWith(
      'PicPay',
      'ms-fake-service',
      'README.md',
    );
  });
});
