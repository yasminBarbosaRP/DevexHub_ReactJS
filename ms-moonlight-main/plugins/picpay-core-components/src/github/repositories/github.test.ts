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

  it('Should return the branches from the repository', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        request: jest.fn().mockImplementation(() => {
          return {
            data: [{
              name: 'main',
              commit: {
                sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
                url: 'https://example.com/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
              }
            },
            {
              name: 'qa',
              commit: {
                sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479aadd',
                url: 'https://example.com/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479aadd',
              }
            }],
          };
        }),
      };
    });

    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.getRepositoryBranches('Picpay', 'ms-test-service');
    expect(githubApi.request).toHaveBeenCalledWith(
      "GET /repos/{owner}/{repo}/branches",
      {
        "headers": {
          "X-GitHub-Api-Version": "2022-11-28"
        },
        "owner": "Picpay",
        "repo": "ms-test-service"
      }
    );
    expect(content).toEqual([
      {
        name: 'main',
        commit: {
          sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
          url: 'https://example.com/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc'
        }
      },
      {
        name: 'qa',
        commit: {
          sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479aadd',
          url: 'https://example.com/commits/c5b97d5ae6c19d5c5df71a34c7fbeeda2479aadd',
        }
      }
    ]);
  });

  it('Should return sha commits of the file', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        request: jest.fn().mockImplementation(() => {
          return {
            data: {
              type: "file",
              encoding: "base64",
              size: 5362,
              name: "template.yaml",
              path: "template.yaml",
              sha: "c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc"
            },
          };
        }),
      };
    });

    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const sha = await githubRepo.getShaFromFile(
      'Picpay',
      'ms-test',
      'main',
      'template.yaml',
    );
    expect(githubApi.request).toHaveBeenCalledWith(
      "GET /repos/{owner}/{repo}/contents/{path}",
      {
        "owner": "Picpay",
        "repo": "ms-test",
        "path": "template.yaml",
        "ref": "main"
      }
    );
    expect(sha).toEqual('c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc');
  });

  it('Should create or update file in repository', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            createOrUpdateFileContents: jest.fn().mockImplementation(() => {
              return {
                data: {
                  content: {
                    name: "hello.txt",
                    path: "notes/hello.txt",
                    sha: "95b966ae1c166bd92f8ae7d1c313e738c731dfc3",
                    size: 9
                  },
                  commit: {
                    sha: "7638417db6d59f3c431d3e1f261cc637155684cd"
                  }
                },
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.createOrUpdateFile(
      'Picpay',
      'ms-test',
      'main',
      'template.yaml',
      'Zm9vYmFyPWZvb2xiYXI=',
      'Update: update file template.yaml',
      'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
    );

    expect(githubApi.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
      owner: 'Picpay',
      repo: 'ms-test',
      path: 'template.yaml',
      message: 'Update: update file template.yaml',
      content: 'Zm9vYmFyPWZvb2xiYXI=',
      sha: 'c5b97d5ae6c19d5c5df71a34c7fbeeda2479ccbc',
      branch: 'main',
    });
    expect(content).toEqual({
      content: {
        name: "hello.txt",
        path: "notes/hello.txt",
        sha: "95b966ae1c166bd92f8ae7d1c313e738c731dfc3",
        size: 9
      },
      commit: {
        sha: "7638417db6d59f3c431d3e1f261cc637155684cd"
      }
    });
  });

  it('Should return the branch\'s commit hashes', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            listCommits: jest.fn().mockImplementation(() => {
              return {
                data: [{
                  sha: "7638417db6d59f3c431d3e1f261cc637155684cd"
                }, {
                  sha: "95b966ae1c166bd92f8ae7d1c313e738c731dfc3"
                }],
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const githubRepo = new GithubRepository(githubApi);

    const content = await githubRepo.getHashes(
      'Picpay',
      'ms-test',
      'main',
      2,
    );

    expect(githubApi.rest.repos.listCommits).toHaveBeenCalledWith({
      owner: 'Picpay',
      repo: 'ms-test',
      sha: 'main',
      per_page: 2
    });
    expect(content).toEqual([
      '7638417db6d59f3c431d3e1f261cc637155684cd',
      '95b966ae1c166bd92f8ae7d1c313e738c731dfc3'
    ]);
  });

  it('should run a query', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        request: jest.fn().mockResolvedValue({ data: 'data' })
      };
    });

    const githubApi = new Octokit();
    const github = new GithubRepository(githubApi);

    const query = 'query';
    const variables = { var1: 'value1' };
    const data = await github.runQuery(query, variables);

    expect(githubApi.request).toHaveBeenCalledWith('POST /graphql', { query, variables });
    expect(data).toEqual({ "data": "data" });
  });
});
