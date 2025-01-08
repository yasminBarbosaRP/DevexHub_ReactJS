import { Octokit } from 'octokit';
import { readFileSync, statSync } from 'fs';
import { isBinaryFileSync } from 'isbinaryfile';
import { relative } from 'path';
import globby from 'globby';
import * as fs from 'fs';

export async function pushFilesToBranch(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
  cwd: string,
  files: string[],
  commitMessage: string,
  force?: boolean | undefined,
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
  await octo.rest.git.updateRef({
    owner: org,
    repo: repo,
    ref: `heads/${targetBranch}`,
    sha: commit.sha,
    force,
  });
}

export async function createPullRequest(
  octo: Octokit,
  owner: string,
  repo: string,
  title: string,
  body: string,
  targetBranch: string,
  baseBranch: string,
): Promise<{ url: string; number: number }> {
  const { data } = await octo.rest.pulls.create({
    owner,
    repo,
    title,
    body,
    head: targetBranch,
    base: baseBranch,
  });
  return {
    url: data.url,
    number: data.number,
  };
}

export async function getPullRequest(
  octo: Octokit,
  owner: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
): Promise<{ url: string; number: number }> {
  const { data: prs } = await octo.rest.pulls.list({
    owner,
    repo,
    base: baseBranch,
    head: `PicPay:${targetBranch}`,
  });

  for (const item of prs) {
    return {
      url: item.url,
      number: item.number,
    };
  }
  throw new Error(`pull request not found`);
}

export async function getBranchRef(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
  createIfDontExists: boolean = true,
): Promise<{ commitSha: string; treeSha: string }> {
  const commitSha = await getRefSha(
    octo,
    org,
    repo,
    targetBranch,
    baseBranch,
    createIfDontExists,
  );
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

export async function getBaseRef(
  octo: Octokit,
  org: string,
  repo: string,
): Promise<string> {
  const { data: refData } = await octo.rest.repos.get({ owner: org, repo });
  return refData.default_branch;
}

export async function getFile(
  octo: Octokit,
  org: string,
  repo: string,
  fileSha: string,
): Promise<{
  content: string;
  encoding: string;
  url: string;
  sha: string;
  size: number | null;
  node_id: string;
  highlighted_content?: string | undefined;
}> {
  const { data } = await octo.rest.git.getBlob({
    owner: org,
    repo,
    file_sha: fileSha,
  });
  return data;
}

export async function getTree(
  octo: Octokit,
  org: string,
  repo: string,
  baseTreeSha: string,
  recursive: boolean = false,
): Promise<{
  sha: string;
  url: string;
  truncated: boolean;
  /** Objects specifying a tree structure */
  tree: {
    path?: string;
    mode?: string;
    type?: string;
    sha?: string;
    size?: number;
    url?: string;
  }[];
}> {
  const { data } = await octo.rest.git.getTree({
    owner: org,
    repo: repo,
    tree_sha: baseTreeSha,
    recursive: JSON.stringify(recursive),
  });

  return data;
}

export async function createRefSha(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
): Promise<string> {
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

async function getRefSha(
  octo: Octokit,
  org: string,
  repo: string,
  targetBranch: string,
  baseBranch: string,
  createIfDontExists: boolean = true,
): Promise<string> {
  try {
    const { data: refData } = await octo.rest.git.getRef({
      owner: org,
      repo: repo,
      ref: `heads/${targetBranch}`,
    });
    return refData.object.sha;
  } catch (e: any) {
    if (e.message === 'Not Found' && createIfDontExists) {
      const refSha = await createRefSha(
        octo,
        org,
        repo,
        targetBranch,
        baseBranch,
      );
      return refSha;
    }
    throw e;
  }
}

export async function createTree(
  octo: Octokit,
  org: string,
  repo: string,
  baseTreeSha: string,
  cwd: string,
  paths: string[],
) {
  const filesToAdd: string[] = [];
  const treeItems = [];

  for (const path of paths) {
    if (!fs.existsSync(`${cwd}/${path}`)) {
      treeItems.push({
        path: `${path}`,
        mode: '100644',
        type: 'blob',
        sha: null,
      });

      continue;
    }

    if (statSync(`${cwd}/${path}`).isDirectory()) {
      filesToAdd.push(
        ...(await globby(`${cwd}/${path}/**/*`, {
          onlyFiles: true,
        })),
      );
    } else {
      filesToAdd.push(
        ...(await globby(`${cwd}/${path}`, {
          onlyFiles: true,
        })),
      );
    }
  }

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
    // @ts-ignore
    tree: treeItems,
    base_tree: baseTreeSha,
  });

  return data;
}

export async function createBlob(
  octo: Octokit,
  org: string,
  repo: string,
  file: string,
) {
  let createBlobDto;
  console.info('file', file);
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

export async function createNewCommit(
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

export function getFileMode(path: string): '100644' | '100755' {
  return isBinaryFileSync(path) ? '100755' : '100644';
}
