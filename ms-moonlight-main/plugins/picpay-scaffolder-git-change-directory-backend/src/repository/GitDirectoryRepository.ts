import { Octokit } from 'octokit';
import { OpsHarnessOptions } from '../interfaces/OpsHarness';
import {
  getTree,
  createTree,
  getBranchRef,
  createNewCommit,
  setBranchToCommit,
} from './GitOperations';
import { ActionContext } from '@backstage/plugin-scaffolder-node';

export class GitDirectoryRepository {
  private readonly context: ActionContext<{}>;
  private readonly githubAPI: Octokit;

  constructor(options: OpsHarnessOptions) {
    this.context = options.context;
    this.githubAPI = options.githubAPI;
  }

  private isDirectory(type: string) {
    return type === 'tree' ? true : false;
  }

  public async moveFilesFromDirectory(
    serviceName: string,
    repositoryName: string,
    baseBranch: string = 'main',
    targetBranch: string = 'main',
    sourcePath: string,
    destPath: string,
  ) {
    const Organization = 'PicPay';
    const commitMessage = `feat: disable the service ${serviceName}`;
    this.context.logger.info(
      `getting the current commit for branch ${baseBranch} and target ${targetBranch}`,
    );
    const currentCommit = await getBranchRef(
      this.githubAPI,
      Organization,
      repositoryName,
      targetBranch,
      baseBranch,
    );
    const currentTree = await getTree(
      this.githubAPI,
      Organization,
      repositoryName,
      currentCommit.treeSha,
      true,
    );
    this.context.logger.info(
      `current tree with ${currentTree.tree.length} files`,
    );
    this.context.logger.info(
      `changing files from directory ${sourcePath} to ${destPath}`,
    );
    const treeEntries = [];
    for (const entry of currentTree.tree) {
      if (!this.isDirectory(entry.type) && entry.path.includes(sourcePath)) {
        const newEntryPath = entry.path.replace(sourcePath, destPath);
        treeEntries.push({ ...entry, path: newEntryPath });
        treeEntries.push({ ...entry, sha: null });
      }
    }

    this.context.logger.info(`the new tree has ${treeEntries.length} length`);
    if (treeEntries.length <= 0) {
      this.context.logger.info(
        `there is no changes for repository ${repositoryName} and service ${serviceName} to target branch ${targetBranch}`,
      );
      return;
    }

    this.context.logger.info('creating a new tree entry');
    const newTree = await createTree(
      this.githubAPI,
      Organization,
      repositoryName,
      currentCommit.treeSha,
      treeEntries,
    );

    this.context.logger.info('creating a new commit');
    const newCommit = await createNewCommit(
      this.githubAPI,
      Organization,
      repositoryName,
      commitMessage,
      newTree.sha,
      currentCommit.commitSha,
    );

    this.context.logger.info(`pushing changes to branch ${targetBranch}`);
    await setBranchToCommit(
      this.githubAPI,
      Organization,
      repositoryName,
      targetBranch,
      newCommit.sha,
    );
  }
}
