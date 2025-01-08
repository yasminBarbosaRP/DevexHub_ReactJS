import yaml from 'js-yaml';
import { configureAddonsApplicationConfig } from './addons-application-config';


// Helper to create a logger mock
const createLoggerMock = () => jest.fn().mockImplementation(() => ({
  error: jest.fn(),
  debug: jest.fn(),
}));

// Helper to create an Octokit mock
const createOctokitMock = (content: string) => {
  const Octokit = jest.fn();
  const githubAPI = new Octokit();
  githubAPI.rest = {
    repos: {
      getContent: jest.fn().mockResolvedValue({
        status: 200,
        data: {
          content,
        },
      }),
    },
  };
  return githubAPI;
};

// Helper to validate content and expectations
const getExpectedContent = async (
  githubAPI: any,
  repo: string = 'eks-fake-use1-hom'
): Promise<unknown> => {
  const Logger = createLoggerMock();
  const logger = new Logger()
  const [_, content] = await configureAddonsApplicationConfig(logger, githubAPI, repo, 'app-infra/hom/eks-fake-use1-hom.yaml');
  const expectedFirstFloorContent = yaml.load(content);
  // @ts-ignore
  return yaml.load(expectedFirstFloorContent.spec.source.helm.values);
};

describe('#AddonsApplicationConfigTest', () => {
  it('should add argoRollouts plugin as true when not exists', async () => {
    const githubAPI = createOctokitMock('YXBpVmVyc2lvbjogYXJnb3Byb2ouaW8vdjFhbHBoYTEKa2luZDogQXBwbGljYXRpb24KbWV0YWRhdGE6CiAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQpzcGVjOgogIGRlc3RpbmF0aW9uOgogICAgbmFtZTogaW4tY2x1c3RlcgogICAgbmFtZXNwYWNlOiBhcmdvY2QKICBwcm9qZWN0OiBhZGRvbnMKICBzb3VyY2U6CiAgICBoZWxtOgogICAgICB2YWx1ZUZpbGVzOgogICAgICAgIC0gdmFsdWVzLnlhbWwKICAgICAgdmFsdWVzOiB8CiAgICAgICAgYWRkb25zOgogICAgICAgICAgICBlYnM6CiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlCiAgICAgICAgICAgIGVmczoKICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICAgICAgZmFsY29uOgogICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZQogICAgICAgICAgICByYmFjOgogICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZQogICAgICAgICAgICBjZXJ0TWFuYWdlcjoKICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICAgICAgc3VubGlnaHRUZWxlbWV0cnlDb2xsZWN0b3I6CiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlCiAgICAgICAgbmFtZUNsdXN0ZXI6IGVrcy1kZXZleHAtdXNlMS1ob20KICAgICAgICBkZXN0aW5hdGlvbjoKICAgICAgICAgICAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQogICAgICAgIHNvdXJjZToKICAgICAgICAgICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9zdGFjay10ZXJyYWZvcm0tZWtzLWRldmV4cC1jay1ob20uZ2l0CiAgICAgICAgICAgIHRhcmdldFJldmlzaW9uOiBIRUFECiAgICAgICAgcHJvamVjdDogYWRkb25zCiAgICBwYXRoOiBhcHAtb2YtYXBwcwogICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9hZGRvbnMtYXBsaWNhdGlvbi1jb25maWcuZ2l0CiAgICB0YXJnZXRSZXZpc2lvbjogSEVBRAogIHN5bmNQb2xpY3k6CiAgICBhdXRvbWF0ZWQ6CiAgICAgIHBydW5lOiB0cnVlCiAgICAgIHNlbGZIZWFsOiB0cnVlCiAgICBzeW5jT3B0aW9uczoKICAgICAgLSBDcmVhdGVOYW1lc3BhY2U9dHJ1ZQogICAgICAtIFNlcnZlclNpZGVBcHBseT10cnVlCiAgICAgIC0gUHJ1bmVMYXN0PXRydWUKICAgICAgLSBBcHBseU91dE9mU3luY09ubHk9dHJ1ZQo=');

    const expectedSecondFloorContent = await getExpectedContent(githubAPI, 'addons-aplication-config');

    // @ts-ignore
    expect(expectedSecondFloorContent.addons.argoRollouts.enabled).toEqual(true);
    expect(githubAPI.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'PicPay',
      repo: 'addons-aplication-config',
      path: 'app-infra/hom/eks-fake-use1-hom.yaml',
      ref: 'main'
    });
  });

  it('should turn-on argoRollouts plugin when it is false', async () => {
    const githubAPI = createOctokitMock('YXBpVmVyc2lvbjogYXJnb3Byb2ouaW8vdjFhbHBoYTEKa2luZDogQXBwbGljYXRpb24KbWV0YWRhdGE6CiAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQpzcGVjOgogIGRlc3RpbmF0aW9uOgogICAgbmFtZTogaW4tY2x1c3RlcgogICAgbmFtZXNwYWNlOiBhcmdvY2QKICBwcm9qZWN0OiBhZGRvbnMKICBzb3VyY2U6CiAgICBoZWxtOgogICAgICB2YWx1ZUZpbGVzOgogICAgICAgIC0gdmFsdWVzLnlhbWwKICAgICAgdmFsdWVzOiB8CiAgICAgICAgYWRkb25zOgogICAgICAgICAgICBhcmdvUm9sbG91dHM6CiAgICAgICAgICAgICAgICBlbmFibGVkOiBmYWxzZQogICAgICAgICAgICBlYnM6CiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlCiAgICAgICAgICAgIGVmczoKICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICAgICAgZmFsY29uOgogICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZQogICAgICAgICAgICByYmFjOgogICAgICAgICAgICAgICAgZW5hYmxlZDogdHJ1ZQogICAgICAgICAgICBjZXJ0TWFuYWdlcjoKICAgICAgICAgICAgICAgIGVuYWJsZWQ6IHRydWUKICAgICAgICAgICAgc3VubGlnaHRUZWxlbWV0cnlDb2xsZWN0b3I6CiAgICAgICAgICAgICAgICBlbmFibGVkOiB0cnVlCiAgICAgICAgbmFtZUNsdXN0ZXI6IGVrcy1kZXZleHAtdXNlMS1ob20KICAgICAgICBkZXN0aW5hdGlvbjoKICAgICAgICAgICAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQogICAgICAgIHNvdXJjZToKICAgICAgICAgICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9zdGFjay10ZXJyYWZvcm0tZWtzLWRldmV4cC1jay1ob20uZ2l0CiAgICAgICAgICAgIHRhcmdldFJldmlzaW9uOiBIRUFECiAgICAgICAgcHJvamVjdDogYWRkb25zCiAgICBwYXRoOiBhcHAtb2YtYXBwcwogICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9hZGRvbnMtYXBsaWNhdGlvbi1jb25maWcuZ2l0CiAgICB0YXJnZXRSZXZpc2lvbjogSEVBRAogIHN5bmNQb2xpY3k6CiAgICBhdXRvbWF0ZWQ6CiAgICAgIHBydW5lOiB0cnVlCiAgICAgIHNlbGZIZWFsOiB0cnVlCiAgICBzeW5jT3B0aW9uczoKICAgICAgLSBDcmVhdGVOYW1lc3BhY2U9dHJ1ZQogICAgICAtIFNlcnZlclNpZGVBcHBseT10cnVlCiAgICAgIC0gUHJ1bmVMYXN0PXRydWUKICAgICAgLSBBcHBseU91dE9mU3luY09ubHk9dHJ1ZQo=');

    const expectedSecondFloorContent = await getExpectedContent(githubAPI, 'addons-aplication-config');

    // @ts-ignore
    expect(expectedSecondFloorContent.addons.argoRollouts.enabled).toEqual(true);
    expect(githubAPI.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'PicPay',
      repo: 'addons-aplication-config',
      path: 'app-infra/hom/eks-fake-use1-hom.yaml',
      ref: 'main'
    });
  });

  it('should add argoRollouts plugin when does not have any another plugin installed', async () => {
    const githubAPI = createOctokitMock('YXBpVmVyc2lvbjogYXJnb3Byb2ouaW8vdjFhbHBoYTEKa2luZDogQXBwbGljYXRpb24KbWV0YWRhdGE6CiAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQpzcGVjOgogIGRlc3RpbmF0aW9uOgogICAgbmFtZTogaW4tY2x1c3RlcgogICAgbmFtZXNwYWNlOiBhcmdvY2QKICBwcm9qZWN0OiBhZGRvbnMKICBzb3VyY2U6CiAgICBoZWxtOgogICAgICB2YWx1ZUZpbGVzOgogICAgICAgIC0gdmFsdWVzLnlhbWwKICAgICAgdmFsdWVzOiB8CiAgICAgICAgbmFtZUNsdXN0ZXI6IGVrcy1kZXZleHAtdXNlMS1ob20KICAgICAgICBkZXN0aW5hdGlvbjoKICAgICAgICAgICAgbmFtZTogZWtzLWRldmV4cC11c2UxLWhvbQogICAgICAgIHNvdXJjZToKICAgICAgICAgICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9zdGFjay10ZXJyYWZvcm0tZWtzLWRldmV4cC1jay1ob20uZ2l0CiAgICAgICAgICAgIHRhcmdldFJldmlzaW9uOiBIRUFECiAgICAgICAgcHJvamVjdDogYWRkb25zCiAgICBwYXRoOiBhcHAtb2YtYXBwcwogICAgcmVwb1VSTDogaHR0cHM6Ly9naXRodWIuY29tL1BpY1BheS9hZGRvbnMtYXBsaWNhdGlvbi1jb25maWcuZ2l0CiAgICB0YXJnZXRSZXZpc2lvbjogSEVBRAogIHN5bmNQb2xpY3k6CiAgICBhdXRvbWF0ZWQ6CiAgICAgIHBydW5lOiB0cnVlCiAgICAgIHNlbGZIZWFsOiB0cnVlCiAgICBzeW5jT3B0aW9uczoKICAgICAgLSBDcmVhdGVOYW1lc3BhY2U9dHJ1ZQogICAgICAtIFNlcnZlclNpZGVBcHBseT10cnVlCiAgICAgIC0gUHJ1bmVMYXN0PXRydWUKICAgICAgLSBBcHBseU91dE9mU3luY09ubHk9dHJ1ZQo=');

    const expectedSecondFloorContent = await getExpectedContent(githubAPI, 'addons-aplication-config');

    // @ts-ignore
    expect(expectedSecondFloorContent.addons.argoRollouts.enabled).toEqual(true);
    expect(githubAPI.rest.repos.getContent).toHaveBeenCalledWith({
      owner: 'PicPay',
      repo: 'addons-aplication-config',
      path: 'app-infra/hom/eks-fake-use1-hom.yaml',
      ref: 'main'
    });
  });
});
