import { Octokit } from 'octokit';
import { ContentEntity, Files, Settings } from '../interfaces/githubRepository';

export class GithubRepository {
  private readonly githubAPI: Octokit;

  constructor(githubAPI: Octokit) {
    this.githubAPI = githubAPI;
  }

  async getFiles(owner: string, repo: string): Promise<Files[]> {
    const { data } = await this.githubAPI.request(
      `GET /repos/${owner}/${repo}/contents`,
    );
    return data;
  }

  async getSettings(owner: string, repo: string): Promise<Settings[]> {
    const { data } = await this.githubAPI.rest.repos.listWebhooks({
      owner,
      repo,
    });
    return data;
  }

  async getContent(
    owner: string,
    repo: string,
    path: string,
  ): Promise<ContentEntity> {
    const { data } = await this.githubAPI.rest.repos.getContent({
      owner,
      repo,
      path,
    });

    if (Array.isArray(data)) throw new Error(`Invalid data from ${path}`);

    return data;
  }
}
