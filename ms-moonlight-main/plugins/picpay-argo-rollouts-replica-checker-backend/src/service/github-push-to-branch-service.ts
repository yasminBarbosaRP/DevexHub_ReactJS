import { Octokit } from 'octokit';
import { GithubCredentialsProvider, ScmIntegrations } from '@backstage/integration';

export const createGithubConnection = async (
  integrations: ScmIntegrations,
  credentialProviderToken?: GithubCredentialsProvider,
): Promise<Octokit> => {
  const credentials = await credentialProviderToken?.getCredentials({
    url: `https://github.com/PicPay/`,
  });
  return new Octokit({
    auth: credentials?.token,
    ...integrations,
    baseUrl: 'https://api.github.com',
    headers: { Accept: 'application/vnd.github.machine-man-preview+json' },
  });
};

export async function createPullRequest(
  octo: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  targetBranch: string,
  baseBranch: string,
): Promise<[prURL: string, prNumber: number]> {
  const { data } = await octo.rest.pulls.create({
    owner,
    repo,
    title,
    body,
    base: baseBranch,
    head: `${targetBranch}`,
  });
  return [data.url, data.number];
}

export async function createBranch(
  octokit: Octokit,
  owner: string,
  repo: string,
  baseBranch: string,
  newBranch: string,
) {
  try {
    // 1. Get the latest commit from the base branch
    const { data: baseBranchData } = await octokit.rest.repos.getBranch({
      owner,
      repo,
      branch: baseBranch,
    });

    const latestCommitSha = baseBranchData.commit.sha;

    // 2. Create a new branch
    await octokit.rest.git.createRef({
      owner,
      repo,
      ref: `refs/heads/${newBranch}`,
      sha: latestCommitSha,
    });

    return latestCommitSha;
  } catch (error) { /* empty */ }
  return '';
}

export async function updateFile(
  octokit: Octokit,
  owner: string,
  repo: string,
  newBranch: string,
  filePath: string,
  commitMessage: string,
  newFileContent: string,
) {
  try {
    const response = await octokit.rest.repos.getContent({
      owner: owner,
      repo: repo,
      path: filePath,
      branch: newBranch,
    });

    // Check if the response contains the file's SHA
    const fileSha = Array.isArray(response?.data) ? response?.data[0]?.sha : response?.data?.sha;

    await octokit.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: filePath,
      message: commitMessage,
      content: Buffer.from(`${newFileContent}`).toString('base64'),
      sha: fileSha, // Required to update an existing file
      branch: newBranch, // Target the new branch
    });
  } catch (error) { /* empty */ }
}

export const createSingleFilePullRequest = async (octokit: Octokit,
  repository: string,
  newBranchName: string,
  filepath: string,
  updatedContent: string,
  commitMessage: string,
): Promise<string> => {
  await createBranch(
    octokit,
    'PicPay',
    repository,
    'main',
    newBranchName);

  await updateFile(
    octokit,
    'PicPay',
    repository,
    newBranchName,
    filepath,
    commitMessage,
    updatedContent);

  const [url, _] = await createPullRequest(
    octokit,
    'PicPay',
    repository,
    `feat: ${commitMessage}`,
    commitMessage,
    newBranchName,
    'main',
  );
  return url;
};
