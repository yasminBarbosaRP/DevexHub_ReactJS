import { GithubRepository } from './github';

describe('#Github', () => {
  it('should initialize repository successfully', () => {
    const Octokit = jest.fn();
    const githubApi = new Octokit();
    const repository = new GithubRepository(githubApi);

    expect(repository).toBeInstanceOf(GithubRepository);
  });

  it('should get contents successfully as array', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn(() => {
              return {
                data: [
                  {
                    name: 'k8s-prod',
                    path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions/k8s-prod',
                    content: 'blable',
                  },
                ],
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const repository = new GithubRepository(githubApi);

    const contents = await repository.getContents(
      'picpay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions',
    );

    expect(githubApi.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'picpay',
      path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions',
      repo: 'ops-harness-setup',
    });

    expect(contents).toEqual([
      {
        name: 'k8s-prod',
        path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions/k8s-prod',
        content: 'blable',
      },
    ]);
  });

  it('should get contents successfully as hash-table', async () => {
    const Octokit = jest.fn().mockImplementation(() => {
      return {
        rest: {
          repos: {
            getContent: jest.fn(() => {
              return {
                data: {
                  name: 'k8s-prod',
                  path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions/k8s-prod',
                  content: 'blable',
                },
              };
            }),
          },
        },
      };
    });
    const githubApi = new Octokit();
    const repository = new GithubRepository(githubApi);

    const contents = await repository.getContents(
      'picpay',
      'ops-harness-setup',
      'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions',
    );

    expect(githubApi.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'picpay',
      path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions',
      repo: 'ops-harness-setup',
    });

    expect(contents).toEqual({
      name: 'k8s-prod',
      path: 'Setup/Applications/ms-foobar/Environemnts/prod/Infrastructure%20Definitions/k8s-prod',
      content: 'blable',
    });
  });
});
