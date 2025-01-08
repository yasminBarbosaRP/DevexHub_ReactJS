import { ContentsRepository } from './contents';

jest.mock('@octokit/rest');

const mockSuccessContent = jest.fn().mockImplementation(() => ({
  data: {
    name: '.moonlight.yaml',
    sha: 'c54692e6fa86e9b60a0de7d11a8f735d5791de21b9fc366c0896f6e75b774368',
    path: '.moonlight.yaml',
    content:
      'c29uYXI6CiAgZW5hYmxlZDogdHJ1ZQogIHR5cGU6IG90aGVyCgpidWlsZDoK\nICBlbmFibGVkOiB0cnVlCgpzdGVwczoKICAtIG5hbWU6IHVuaXQtdGVzdHMK\nICAgIGltYWdlOiAyODkyMDgxMTQzODkuZGtyLmVjci51cy1lYXN0LTEuYW1h\nem9uYXdzLmNvbS9waWNwYXkvcHl0aG9uOjMuNy1zbGltCiAgICBjb21tYW5k\nczoKICAgICAgLSBjaG1vZCAreCAuL3V0aWxzL2NvZGVfdmFsaWRhdGlvbi5z\naAogICAgICAtIC4vdXRpbHMvY29kZV92YWxpZGF0aW9uLnNoCg==\n',
  },
}));
const mockDataAsArray = jest.fn().mockImplementation(() => ({
  headers: {
    status: 201,
  },
  data: [{}],
}));
const mockDataWithoutContent = jest.fn().mockImplementation(() => ({
  headers: {
    status: 201,
  },
  data: {
    name: '.moonlight.yaml',
    path: '.moonlight.yaml',
  },
}));

describe('Contents', () => {
  it('should export plugin', () => {
    expect(ContentsRepository).toBeDefined();
  });
});

describe('getContent', () => {
  it('should export getContent function', () => {
    expect(ContentsRepository.prototype.getContent).toBeDefined();
  });

  it("should get file's contents", async () => {
    const Octokit = jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: mockSuccessContent,
        },
      },
    }));

    const mockGithubApi = new Octokit();
    const contentRepo = new ContentsRepository(mockGithubApi);
    const repository = 'foo';
    const filename = '.moonlight.yaml';

    const response = await contentRepo.getContent(repository, filename);

    expect(response).toEqual({
      sha: 'c54692e6fa86e9b60a0de7d11a8f735d5791de21b9fc366c0896f6e75b774368',
      content: {
        build: { enabled: true },
        sonar: {
          enabled: true,
          type: 'other',
        },
        steps: [
          {
            commands: [
              'chmod +x ./utils/code_validation.sh',
              './utils/code_validation.sh',
            ],
            image:
              '289208114389.dkr.ecr.us-east-1.amazonaws.com/picpay/python:3.7-slim',
            name: 'unit-tests',
          },
        ],
      },
    });
  });

  it('should throw an exception when repository and filename are empty', async () => {
    const Octokit = jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: mockSuccessContent,
        },
      },
    }));

    const mockGithubApi = new Octokit();
    const contentRepo = new ContentsRepository(mockGithubApi);
    const repository = '';
    const filename = '';

    await expect(contentRepo.getContent(repository, filename)).rejects.toThrow(
      'both repository and filename are empty',
    );
  });

  it('should throw an exception when data is array', async () => {
    const Octokit = jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: mockDataAsArray,
        },
      },
    }));

    const mockGithubApi = new Octokit();
    const contentRepo = new ContentsRepository(mockGithubApi);
    const repository = 'ms-fake-service';
    const filename = '.moonlight';

    await expect(contentRepo.getContent(repository, filename)).rejects.toThrow(
      `Invalid data from ${filename}`,
    );
  });

  it('should throw an exception when no content', async () => {
    const Octokit = jest.fn().mockImplementation(() => ({
      rest: {
        repos: {
          getContent: mockDataWithoutContent,
        },
      },
    }));

    const mockGithubApi = new Octokit();
    const contentRepo = new ContentsRepository(mockGithubApi);
    const repository = 'ms-fake-service';
    const filename = '.moonlight';

    await expect(contentRepo.getContent(repository, filename)).rejects.toThrow(
      "Response doesn't contains content keyword",
    );
  });
});
