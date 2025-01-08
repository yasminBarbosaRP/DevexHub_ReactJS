import path from 'path';
import yaml from 'js-yaml';
import { Logger } from 'winston';
import { Octokit } from 'octokit';
import { CatalogApi, GetEntitiesResponse } from '@backstage/catalog-client';
import { InputError } from '@backstage/errors';
import {
  getTree,
  createNewCommit,
  createTree,
  getBranchRef,
  setBranchToCommit,
} from '@internal/plugin-picpay-scaffolder-git-change-directory-backend';
import {
  createBlob,
  createPullRequest,
  getFileMode,
  getPullRequest,
} from '@internal/plugin-picpay-scaffolder-github-backend';
import {
  cleanUp,
  Environment,
  makeCommitMsg,
  writeFileRecursiveTreeSync,
} from './utils';

export const makeTemplate = (clusterProvider: string): any => ({
  harnessApiVersion: '1.0',
  type: 'INFRA_DEFINITION',
  cloudProviderType: 'KUBERNETES_CLUSTER',
  deploymentType: 'KUBERNETES',
  infrastructure: [
    {
      type: 'DIRECT_KUBERNETES',
      cloudProviderName: clusterProvider,
      namespace: '${service.name}',
      releaseName: 'release-${infra.kubernetes.infraId}',
    },
  ],
});

export const environmentResolver = (env: string): string => {
  switch (env.toLowerCase()) {
    case Environment.HOMOLOG:
      return 'qa';
    case Environment.PRODUCTION:
      return 'prd';
    default:
      throw new Error(`Don't resolve the environment: ${env}`);
  }
};

export const getFullPath = (
  serviceName: string,
  environment: string,
): string => {
  const pathname = path.join(
    'Setup',
    'Applications',
    serviceName,
    'Environments',
  );
  return path.join(
    pathname,
    environment === 'prd' ? 'prod' : environment,
    'Infrastructure Definitions/',
  );
};

export class HarnessMigration {
  readonly ORGANIZATION = 'PicPay';
  readonly MAIN_REPOSITORY = 'ops-harness-setup';
  readonly BASE_BRANCH = 'master';

  constructor(
    private logger: Logger,
    private githubApi: Octokit,
    private catalogApi: CatalogApi,
    private workspacePath: string,
    private readonly branch: string | null = null,
  ) {
    this.logger = logger;
    this.githubApi = githubApi;
    this.catalogApi = catalogApi;
    this.workspacePath = workspacePath;
  }

  buildTargetBranch(serviceName: string): string {
    return `feat/${serviceName}-cluster-migration`;
  }

  async execute(
    serviceName: string,
    clusters: any,
  ): Promise<{ url: string; number: number }> {
    const treeItems = [];
    const targetBranch = this.branch || this.buildTargetBranch(serviceName);

    this.logger.debug(
      `getting the cluster shortname for service: ${serviceName} and ${JSON.stringify(
        clusters,
      )}`,
    );
    this.logger.debug('getting the branch reference...');
    const currentCommit = await getBranchRef(
      this.githubApi,
      this.ORGANIZATION,
      this.MAIN_REPOSITORY,
      targetBranch,
      this.BASE_BRANCH,
    );
    this.logger.debug('getting the branch current tree...');
    const currentTree = await getTree(
      this.githubApi,
      this.ORGANIZATION,
      this.MAIN_REPOSITORY,
      currentCommit.treeSha,
      true,
    );

    for (const environment of Object.keys(clusters)) {
      const shortname = await this.getShortname(clusters[environment]);
      const resolvedEnvironment = environmentResolver(environment);
      const clusterProvider = `k8s-${shortname}-${resolvedEnvironment}`;
      const sourcePath = getFullPath(serviceName, resolvedEnvironment);
      const filepath = path.join(
        this.workspacePath,
        sourcePath,
        `${clusterProvider}.yaml`,
      );

      this.logger.info(`deleting files from ${sourcePath}`);
      await this.deleteAllFilesInPath(treeItems, sourcePath, currentTree);

      const content = makeTemplate(clusterProvider);
      writeFileRecursiveTreeSync(filepath, yaml.dump(content));

      this.logger.debug('creating blob...');
      const blob = await createBlob(
        this.githubApi,
        this.ORGANIZATION,
        this.MAIN_REPOSITORY,
        filepath,
      );
      treeItems.push({
        path: path.join(sourcePath, path.basename(filepath)),
        mode: getFileMode(filepath),
        type: 'blob' as 'blob',
        sha: blob.sha,
      });
    }

    try {
      const commitMsg = makeCommitMsg(serviceName);
      const newTree = await createTree(
        this.githubApi,
        this.ORGANIZATION,
        this.MAIN_REPOSITORY,
        currentCommit.treeSha,
        treeItems,
      );
      const newCommit = await createNewCommit(
        this.githubApi,
        this.ORGANIZATION,
        this.MAIN_REPOSITORY,
        commitMsg,
        newTree.sha,
        currentCommit.commitSha,
      );

      await setBranchToCommit(
        this.githubApi,
        this.ORGANIZATION,
        this.MAIN_REPOSITORY,
        targetBranch,
        newCommit.sha,
      );
      cleanUp(
        this.workspacePath,
        treeItems.map(item => item.path),
      );
      this.logger.info('The migration was successfully!');
      const result = await createPullRequest(
        this.githubApi,
        this.ORGANIZATION,
        this.MAIN_REPOSITORY,
        `${serviceName} Cluster Migration`,
        'This PullRequest fixes the new Cloud Providers to make it possible deployments in the new cluster',
        targetBranch,
        this.BASE_BRANCH,
      );

      return { url: result.url, number: result.number };
    } catch (err: any) {
      const message: string = err.message;

      if (message.includes('pull request already exists')) {
        const result = await getPullRequest(
          this.githubApi,
          this.ORGANIZATION,
          this.MAIN_REPOSITORY,
          targetBranch,
          this.BASE_BRANCH,
        );

        this.logger.info(`pull_request_url: ${result.url}`);
        this.logger.info(`pull_request_number: ${result.number}`);
        this.logger.warn(
          `Harness was already fixed before, Pull Request #${result.number} was opened on the destination repository ${this.MAIN_REPOSITORY} at ${result.url}`,
        );

        return {
          url: result.url,
          number: result.number,
        };
      }

      throw err;
    }
  }

  private isDirectory(type: string) {
    return type === 'tree' ? true : false;
  }

  async getShortname(clusterName: string): Promise<string> {
    const filter: { [k: string]: any } = {};
    filter['metadata.name'] = clusterName;
    filter.kind = 'Resource';

    const entities: GetEntitiesResponse = await this.catalogApi.getEntities({
      filter,
    });
    if (entities.items.length === 0 || entities.items.length > 1)
      throw new InputError(
        `Component ${clusterName} not found or more than one entity were found.`,
      );

    const entity = entities.items[0];

    this.logger.debug(`Entity: ${JSON.stringify(entity)}`);

    if (entity.metadata.labels) {
      return entity.metadata.labels['moonlight.picpay/short-name'];
    }

    throw new InputError(`Cluster shortname not found for ${clusterName}`);
  }

  async deleteAllFilesInPath(
    treeItems: any[],
    sourcePath: string,
    currentTree: any,
  ): Promise<void> {
    for (const entry of currentTree.tree) {
      if (!this.isDirectory(entry.type) && entry.path.includes(sourcePath)) {
        this.logger.info(`deleting a new file ${JSON.stringify(entry)}`);
        treeItems.push({ ...entry, sha: null });
      }
    }
  }
}
