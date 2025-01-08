import { Octokit } from 'octokit';
import { Github, TreeItem, TreeStructure } from '../interfaces/github';
import {
  getBranchRef,
  getFile,
  getBaseRef,
  getTree,
  pushFilesToBranch,
  createPullRequest,
  getPullRequest,
} from '@internal/plugin-picpay-scaffolder-github-backend';
import * as winston from 'winston';

export default class GithubUseCase implements Github {
  /**
   *
   */

  constructor(
    private readonly logger: winston.Logger,
    private readonly ockto: Octokit,
  ) {}

  getFileTree(filename: string, treeItems: TreeItem[]): TreeItem | undefined {
    this.logger.debug(`filtering ${filename} in ${JSON.stringify(treeItems)}`);
    return treeItems.find(e => e.path === filename && e.type === 'blob');
  }

  async getPullRequest(
    org: string,
    repo: string,
    targetBranch: string,
    baseBranch: string,
  ): Promise<{ url: string; number: number }> {
    return await getPullRequest(
      this.ockto,
      org,
      repo,
      targetBranch,
      baseBranch,
    );
  }

  async createPullRequest(
    org: string,
    repo: string,
    title: string,
    body: string,
    targetBranch: string,
    baseBranch: string,
  ): Promise<{ url: string; number: number }> {
    return await createPullRequest(
      this.ockto,
      org,
      repo,
      title,
      body,
      targetBranch,
      baseBranch,
    );
  }

  async pushFilesToBranch(
    org: string,
    repo: string,
    targetBranch: string,
    baseBranch: string,
    cwd: string,
    files: string[],
    commitMessage: string,
  ): Promise<void> {
    return await pushFilesToBranch(
      this.ockto,
      org,
      repo,
      targetBranch,
      baseBranch,
      cwd,
      files,
      commitMessage,
    );
  }

  async getDefaultBranch(repo: string, owner: string): Promise<string> {
    this.logger.debug(`getting base branch name`);
    return await getBaseRef(this.ockto, owner, repo);
  }

  async getFileContentFromSHA(repo: string, fileSha: string): Promise<string> {
    this.logger.debug(`getting file content for ${repo} with sha ${fileSha}`);
    const fileInfo = await getFile(this.ockto, 'PicPay', repo, fileSha);

    this.logger.debug(`converting file base64 to string`);
    return Buffer.from(fileInfo.content, 'base64').toString();
  }

  async getTree(
    repo: string,
    owner: string,
    branch: string,
  ): Promise<TreeStructure> {
    this.logger.debug(`getting base branch information`);
    const branchInfo = await getBranchRef(
      this.ockto,
      owner,
      repo,
      branch,
      branch,
      false,
    );

    this.logger.debug(`getting base branch tree`);
    const repoTree = await getTree(this.ockto, owner, repo, branchInfo.treeSha);

    return repoTree;
  }
}
