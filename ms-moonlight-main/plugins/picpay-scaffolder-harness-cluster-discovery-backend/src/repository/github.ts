import { Octokit } from 'octokit';
import { ContentEntity } from '../domain/contents';

export class GithubRepository {
  private readonly githubAPI: Octokit;

  constructor(githubAPI: Octokit) {
    this.githubAPI = githubAPI;
  }

  async getContents(
    owner: string,
    repo: string,
    path: string,
  ): Promise<ContentEntity | ContentEntity[]> {
    const { data } = await this.githubAPI.rest.repos.getContent({
      owner,
      repo,
      path,
    });
    return data;
  }
}
