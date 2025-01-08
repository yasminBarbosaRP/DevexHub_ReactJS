import { createPullRequest, createBranch, updateFile, createSingleFilePullRequest } from './github-push-to-branch-service';

describe('GitHub Push to Branch Service', () => {
  const Octokit = jest.fn().mockImplementation(() => {
    return {
      rest: {
        repos: {
          getContent: jest.fn(),
          getBranch: jest.fn(),
          createOrUpdateFileContents: jest.fn(),
        },
        git: {
          createRef: jest.fn(),
        },
        pulls: {
          create: jest.fn(),
        }
      },
      request: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPullRequest', () => {
    it('should create a pull request', async () => {
      const mockResponse = { data: { url: 'http://fake-pr-url', number: 1 } };
      const octokit = new Octokit();
      octokit.rest.pulls.create.mockResolvedValue(mockResponse);

      const [url, number] = await createPullRequest(octokit, 'owner', 'repo', 'title', 'body', 'targetBranch', 'baseBranch');

      expect(url).toBe('http://fake-pr-url');
      expect(number).toBe(1);
      expect(octokit.rest.pulls.create).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        title: 'title',
        body: 'body',
        base: 'baseBranch',
        head: 'targetBranch',
      });
    });
  });

  describe('createBranch', () => {
    it('should create a new branch', async () => {
      const mockBranchData = { commit: { sha: 'fake-sha' } };
      const octokit = new Octokit();
      octokit.rest.repos.getBranch = jest.fn().mockResolvedValue({ data: mockBranchData });
      octokit.rest.git.createRef = jest.fn().mockResolvedValue({});

      const sha = await createBranch(octokit, 'owner', 'repo', 'baseBranch', 'newBranch');

      expect(sha).toBe('fake-sha');
      expect(octokit.rest.repos.getBranch).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        branch: 'baseBranch',
      });
      expect(octokit.rest.git.createRef).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        ref: 'refs/heads/newBranch',
        sha: 'fake-sha',
      });
    });
  });

  describe('updateFile', () => {
    it('should update a file in the repository', async () => {
      const mockGetContentResponse = { data: { sha: 'fake-sha' } };
      const octokit = new Octokit();
      octokit.rest.repos.getContent = jest.fn().mockResolvedValue(mockGetContentResponse);
      octokit.rest.repos.createOrUpdateFileContents = jest.fn().mockResolvedValue({});

      await updateFile(octokit, 'owner', 'repo', 'newBranch', 'filePath', 'commitMessage', 'newFileContent');

      expect(octokit.rest.repos.getContent).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'filePath',
        branch: 'newBranch',
      });
      expect(octokit.rest.repos.createOrUpdateFileContents).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        path: 'filePath',
        message: 'commitMessage',
        content: Buffer.from('newFileContent').toString('base64'),
        sha: 'fake-sha',
        branch: 'newBranch',
      });
    });
  });

  describe('createSingleFilePullRequest', () => {
    it('should create a single file pull request', async () => {
      const octokit = new Octokit();
      octokit.rest.repos.getBranch.mockResolvedValueOnce({ data: { commit: { sha: 'fake-sha' } } });
      octokit.rest.git.createRef.mockResolvedValueOnce({});
      octokit.rest.repos.getContent.mockResolvedValueOnce({ data: { sha: 'fake-sha' } })
      octokit.rest.repos.createOrUpdateFileContents.mockResolvedValueOnce({});
      octokit.rest.pulls.create.mockResolvedValueOnce({ data: { url: 'http://fake-pr-url', number: 1 } });

      const url = await createSingleFilePullRequest(octokit, 'repository', 'newBranchName', 'filepath', 'updatedContent', 'commitMessage');

      expect(url).toBe('http://fake-pr-url');
    });
  });
});
