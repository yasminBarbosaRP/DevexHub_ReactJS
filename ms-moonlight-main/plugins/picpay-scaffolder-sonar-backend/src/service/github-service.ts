import { Octokit } from 'octokit';
import { Logger } from 'winston';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';

export class GithubHelper {
  constructor(
    private logger: Logger,
    private integrations: ScmIntegrations,
    private githubCredentialsProvider: GithubCredentialsProvider,
  ) {}

  async getRepoId(repo: string): Promise<number> {
    const credentialProviderToken =
      await this.githubCredentialsProvider?.getCredentials({
        url: `https://github.com/PicPay/${repo}`,
      });

    const octokit = new Octokit({
      ...this.integrations,
      baseUrl: `https://api.github.com`,
      headers: {
        Accept: 'application/vnd.github.machine-man-preview+json',
      },
      auth: credentialProviderToken?.token,
    });

    this.logger.info('Retriving Repo Information');

    const { data } = await octokit.rest.repos.get({
      owner: 'PicPay',
      repo,
    });

    return data.id;
  }
}
