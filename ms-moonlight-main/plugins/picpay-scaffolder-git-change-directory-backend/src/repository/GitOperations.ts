import { Octokit } from 'octokit';

export async function getBranchRef(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string = 'main',
): Promise<{ commitSha: string; treeSha: string }> {
  const commitSha = await getRefSha(octo, org, repo, targetBranch, baseBranch);
  const { data: commitData } = await octo.rest.git.getCommit({
    owner: org,
    repo: repo,
    commit_sha: commitSha,
  });

  return {
    commitSha,
    treeSha: commitData.tree.sha,
  };
}

async function getRefSha(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
): Promise<string> {
  try {
    const { data: refData } = await octo.rest.git.getRef({
      owner: org,
      repo: repo,
      ref: `heads/${targetBranch}`,
    });
    return refData.object.sha;
  } catch (e: any) {
    if (e.message === 'Not Found') {
      const { data: baseRefData } = await octo.rest.git.getRef({
        owner: org,
        repo: repo,
        ref: `heads/${baseBranch}`,
      });
      const { data: refData } = await octo.rest.git.createRef({
        owner: org,
        repo: repo,
        ref: `refs/heads/${targetBranch}`,
        sha: baseRefData.object.sha,
      });
      return refData.object.sha;
    }
    throw e;
  }
}

export async function getTree(
  octo: Octokit,
  org: string,
  repo: string,
  baseTreeSha: string,
  recursive: boolean = false,
) {
  const { data } = await octo.request(
    `GET /repos/${org}/${repo}/git/trees/${baseTreeSha}?recursive=${recursive}`,
    { owner: org, repo: repo, tree_sha: baseTreeSha },
  );

  return data;
}

export async function createTree(
  octo: Octokit,
  org: string,
  repo: string,
  baseTreeSha: string,
  treeEntries: any[],
) {
  const { data } = await octo.request(`POST /repos/${org}/${repo}/git/trees`, {
    owber: org,
    repo: repo,
    base_tree: baseTreeSha,
    tree: treeEntries,
  });

  return data;
}

export async function createNewCommit(
  octo: Octokit,
  org: string,
  repo: string,
  message: string,
  currentTreeSha: string,
  currentCommitSha: string,
) {
  const { data } = await octo.rest.git.createCommit({
    owner: org,
    tree: currentTreeSha,
    parents: [currentCommitSha],
    repo,
    message,
  });
  return data;
}

export async function setBranchToCommit(
  octo: Octokit,
  org: string,
  repo: string,
  branch: string = `master`,
  commitSha: string,
  force: boolean = false,
) {
  const { data } = await octo.rest.git.updateRef({
    owner: org,
    repo,
    ref: `heads/${branch}`,
    sha: commitSha,
    force: force,
  });
  return data;
}
