import { ContentsRepository as Repository } from '../interfaces/request';
import { Octokit } from 'octokit';
import YAML from 'js-yaml';

const OWNER = 'PicPay';

export class ContentsRepository implements Repository {
  private readonly githubApi: Octokit;

  constructor(githubApi: Octokit) {
    this.githubApi = githubApi;
  }

  async getContent(repository: string, filename: string): Promise<any> {
    if (!repository && !filename)
      throw new Error('both repository and filename are empty');

    const { data } = await this.githubApi.rest.repos.getContent({
      owner: OWNER,
      repo: repository,
      path: filename,
    });

    if (Array.isArray(data)) throw new Error(`Invalid data from ${filename}`);

    if (!('content' in data))
      throw new Error("Response doesn't contains content keyword");

    const content = Buffer.from(data.content, 'base64').toString();
    const response = {
      sha: data.sha,
      content: JSON.parse(JSON.stringify(YAML.load(content, { json: true }))),
    };

    return response;
  }
}
