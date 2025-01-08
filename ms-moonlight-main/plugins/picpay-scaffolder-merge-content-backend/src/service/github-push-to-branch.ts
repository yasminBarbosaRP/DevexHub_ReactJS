import { Octokit } from 'octokit';
import { readFileSync, statSync } from 'fs';
import { isBinaryFileSync } from 'isbinaryfile';
import { relative } from 'path';
import globby from 'globby';

export async function pushFilesToBranch(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
  cwd: string,
  files: string[],
  commitMessage: string,
): Promise<void> {
  const branchRef = await getBranchRef(
    octo,
    org,
    repo,
    targetBranch,
    baseBranch,
  );
  const tree = await createTree(octo, org, repo, branchRef.treeSha, cwd, files);
  const commit = await createNewCommit(
    octo,
    org,
    repo,
    tree.sha,
    branchRef.commitSha,
    commitMessage,
  );
  await updateRef(octo, org, repo, targetBranch, commit.sha);
}

async function getBranchRef(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
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

async function createTree(
  octo: Octokit,
  org: string,
  repo: string,
  baseTreeSha: string,
  cwd: string,
  paths: string[],
) {
  let filesToAdd: string[];
  if (statSync(`${cwd}/${paths}`).isDirectory()) {
    filesToAdd = await globby(`${cwd}/${paths}/**/*`, {
      onlyFiles: true,
    });
  } else {
    filesToAdd = await globby(`${cwd}/${paths}`, {
      onlyFiles: true,
    });
  }

  const treeItems = [];
  for await (const file of filesToAdd) {
    const blobData = await createBlob(octo, org, repo, file);
    treeItems.push({
      path: relative(cwd, file),
      mode: getFileMode(file),
      type: 'blob' as 'blob',
      sha: blobData.sha,
    });
  }

  const { data } = await octo.rest.git.createTree({
    owner: org,
    repo: repo,
    tree: treeItems,
    base_tree: baseTreeSha,
  });

  return data;
}

async function createBlob(
  octo: Octokit,
  org: string,
  repo: string,
  file: string,
) {
  let createBlobDto;
  if (isBinaryFileSync(file)) {
    createBlobDto = {
      content: readFileSync(file, 'base64'),
      encoding: 'base64',
    };
  } else {
    createBlobDto = {
      content: readFileSync(file, 'utf-8'),
      encoding: 'utf-8',
    };
  }

  try {
    const { data: blobData } = await octo.rest.git.createBlob({
      owner: org,
      repo: repo,
      ...createBlobDto,
    });

    return blobData;
  } catch (e: any) {
    throw e;
  }
}

async function createNewCommit(
  octo: Octokit,
  org: string,
  repo: string,
  newTreeSha: string,
  oldTreeSha: string,
  commitMessage: string,
) {
  const { data } = await octo.rest.git.createCommit({
    owner: org,
    repo: repo,
    message: commitMessage,
    tree: newTreeSha,
    parents: [oldTreeSha],
  });

  return data;
}

async function updateRef(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  commitSha: string,
) {
  return await octo.rest.git.updateRef({
    owner: org,
    repo: repo,
    ref: `heads/${targetBranch}`,
    sha: commitSha,
  });
}

function getFileMode(path: string): '100644' | '100755' {
  return isBinaryFileSync(path) ? '100755' : '100644';
}
