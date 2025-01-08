export type TreeItem = {
  path?: string;
  mode?: string;
  type?: string;
  sha?: string;
  size?: number;
  url?: string;
};

export type TreeStructure = {
  sha: string;
  url: string;
  truncated: boolean;
  tree: TreeItem[];
};
export interface Github {
  getTree(repo: string, owner: string, branch: string): Promise<TreeStructure>;
  pushFilesToBranch(
    org: string,
    repo: string,
    targetBranch: string,
    baseBranch: string,
    cwd: string,
    files: string[],
    commitMessage: string,
  ): Promise<void>;
  getDefaultBranch(repo: string, owner: string): Promise<string>;
  getFileTree(filename: string, treeItems: TreeItem[]): TreeItem | undefined;
  getFileContentFromSHA(repo: string, fileSha: string): Promise<string>;
}
