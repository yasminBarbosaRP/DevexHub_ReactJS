import path from 'path';
import { Logger } from 'winston';
import { Octokit } from 'octokit';
import {
  createPullRequest,
  getPullRequest,
  pushFilesToBranch,
} from '@internal/plugin-picpay-scaffolder-github-backend';
import {
  cleanUp,
  Environment,
  makeCommitMsg,
  writeFileRecursiveTreeSync,
} from './utils';

export function environmentResolver(cluster: string): string {
  switch (cluster.toLowerCase()) {
    case Environment.HOMOLOG:
      return 'hom';
    case Environment.PRODUCTION:
      return 'prd';
    default:
      throw new Error(`Environment not found for cluster ${cluster}`);
  }
}

const base64ToString = (content: string) => {
  const buffer = Buffer.from(content, 'base64');
  return buffer.toString('utf-8');
};

export const getFileContent = async (
  githubApi: Octokit,
  org: string,
  repository: string,
  repoPath: string,
) => {
  const { data } = await githubApi.request(
    `GET /repos/${org}/${repository}/contents/${repoPath}`,
    {
      owner: org,
      repo: repository,
      path: repoPath,
    },
  );
  return data;
};

export class ArgoCDMigration {
  readonly ORG = 'PicPay';
  readonly BASE_BRANCH = 'main';
  readonly REPOSITORY = 'gitops-moonlight-pipelines';
  readonly defaultPath = 'apps';
  readonly defaultFilename = 'config.json';

  constructor(
    private logger: Logger,
    private githubApi: Octokit,
    private workspace: string,
    private readonly branch: string | null = null,
  ) {
    this.logger = logger;
    this.githubApi = githubApi;
    this.workspace = workspace;
  }

  buildTargetBranch(serviceName: string) {
    return `feat/${serviceName}-cluster-migration`;
  }

  async execute(
    serviceName: string,
    clusters: any,
  ): Promise<{ url: string; number: number }> {
    const files = [];
    const targetBranch = this.branch || this.buildTargetBranch(serviceName);

    for (const cluster of Object.keys(clusters)) {
      const environment = environmentResolver(cluster);
      const filepath = path.join(
        this.defaultPath,
        serviceName,
        environment,
        this.defaultFilename,
      );
      this.logger.info('get file content on github...');
      const repoContent = await getFileContent(
        this.githubApi,
        this.ORG,
        this.REPOSITORY,
        filepath,
      );

      const content = JSON.parse(base64ToString(repoContent.content));
      content.destination.name = clusters[cluster];

      const output = path.join(this.workspace, filepath);
      this.logger.info('writing files...');
      writeFileRecursiveTreeSync(output, JSON.stringify(content, null, 4));

      files.push(filepath);
    }

    try {
      this.logger.info('pushing new files to branch...');
      await pushFilesToBranch(
        this.githubApi,
        this.ORG,
        this.REPOSITORY,
        targetBranch,
        this.BASE_BRANCH,
        this.workspace,
        files,
        makeCommitMsg(serviceName),
      );
      cleanUp(this.workspace, files);
      this.logger.info('The migration was successfully!');

      const result = await createPullRequest(
        this.githubApi,
        this.ORG,
        this.REPOSITORY,
        'Cluster Migration ArgoCD fix',
        'This PullRequest fixes the new Cloud Providers to make it possible deployments in the new cluster',
        targetBranch,
        this.BASE_BRANCH,
      );

      return {
        url: result.url,
        number: result.number,
      };
    } catch (err: any) {
      const message: string = err.message;

      if (message.includes('pull request already exists')) {
        const result = await getPullRequest(
          this.githubApi,
          this.ORG,
          this.REPOSITORY,
          targetBranch,
          this.BASE_BRANCH,
        );

        this.logger.info(`pull_request_url: ${result.url}`);
        this.logger.info(`pull_request_number: ${result.number}`);
        this.logger.warn(
          `ArgoCD was already fixed before, Pull Request #${result.number} was opened on the destination repository ${this.REPOSITORY} at ${result.url}`,
        );

        return {
          url: result.url,
          number: result.number,
        };
      }

      throw err;
    }
  }
}
