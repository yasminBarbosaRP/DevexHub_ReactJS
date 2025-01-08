import { Octokit } from 'octokit';
import { Content } from '../model/Content';
import Github from '../interfaces/Github';
import { pushFilesToBranch } from '@internal/plugin-picpay-scaffolder-github-backend';

export default class GithubRepository implements Github {
  constructor(private readonly octokit: Octokit) {}

  public async getContents(pathFile: string): Promise<Content> {
    const { data } = await this.octokit.request(`GET ${pathFile}`);
    return data;
  }

  public async pushFileToBranch(
    bu: string,
    owner: string,
    repository: string,
    path: string,
    file: string,
  ): Promise<void> {
    await pushFilesToBranch(
      this.octokit,
      owner,
      repository,
      'main',
      'main',
      path,
      [file],
      `Feat(Update ${file}): Associate Githubs Team with Bu: ${bu}`,
    );
  }
}
