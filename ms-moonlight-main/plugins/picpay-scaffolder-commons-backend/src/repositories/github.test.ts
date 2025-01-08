import { GithubRepository } from './github';

describe('#GithubRepository', () => {
  it('should be instance of', () => {
    const Octokit = jest.fn();
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    expect(githubRepo).toBeInstanceOf(GithubRepository);
  });

  it('should get content successfully', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn().mockImplementation(() => {
              return {
                data: {
                  content: 'foobar',
                },
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.getContent(
      'Picpay',
      'ms-fake-service',
      'README.md',
    );
    expect(content).toEqual({ content: 'foobar' });
    expect(githubApi.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'Picpay',
      repo: 'ms-fake-service',
      path: 'README.md',
    });
  });

  it('should get worng content type and throw exception', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn().mockImplementation(() => {
              return {
                data: [],
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    await expect(
      githubRepo.getContent('Picpay', 'ms-fake-service', 'README.md'),
    ).rejects.toThrow('Invalid data from README.md');
  });

  it('should get files successfully', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        request: jest.fn().mockImplementation(() => {
          return {
            data: [{ name: 'foo', path: 'bar.json', content: 'blable' }],
          };
        }),
      };
    });

    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.getFiles('Picpay', 'ms-fake-service');
    expect(githubApi.request).toHaveBeenCalledWith(
      'GET /repos/Picpay/ms-fake-service/contents',
    );
    expect(content).toEqual([
      { name: 'foo', path: 'bar.json', content: 'blable' },
    ]);
  });

  it('should get settings successfully', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            listWebhooks: jest.fn().mockImplementation(() => {
              return {
                data: [
                  {
                    content: 'foobar',
                  },
                ],
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.getSettings('Picpay', 'ms-fake-service');
    expect(githubApi.rest.repos.listWebhooks).toHaveBeenCalledWith({
      owner: 'Picpay',
      repo: 'ms-fake-service',
    });
    expect(content).toEqual([{ content: 'foobar' }]);
  });
});
