import { Octokit } from 'octokit';
import {
  BranchContent,
  ContentEntity,
  CreateUpdateContent,
  Files,
  Settings,
} from '../interfaces/githubRepository';

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

  async getTeams(owner: string, page: number = 1): Promise<any> {
    const { data } = await this.githubAPI.rest.teams.list({
      org: owner,
      per_page: 100,
      page,
    });
    return data;
  }


  async getTeamMembers(owner: string, teamSlug: string, page: number = 1): Promise<any> {
    const { data } = await this.githubAPI.rest.teams.listMembersInOrg({
      org: owner,
      team_slug: teamSlug,
      per_page: 100,
      page,
    });
    return data;
  }

  async getContent(
    owner: string,
    repo: string,
    path: string,
    branch?: string,
  ): Promise<ContentEntity> {
    const { data } = await this.githubAPI.rest.repos.getContent({
      owner,
      repo,
      path,
      ref: branch,
    });

    if (Array.isArray(data)) throw new Error(`Invalid data from ${path}`);

    return data;
  }

  async getRepositoryBranches(owner: string, repo: string): Promise<BranchContent[]> {
    const { data } = await this.githubAPI.request('GET /repos/{owner}/{repo}/branches', {
      owner,
      repo,
      headers: {
        'X-GitHub-Api-Version': '2022-11-28'
      }
    });

    return data;
  }

  async getShaFromFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
  ): Promise<string> {
    // @ts-ignore
    const { data: { sha } } = await this.githubAPI.request('GET /repos/{owner}/{repo}/contents/{path}', {
      owner,
      repo,
      path,
      ref: branch,
    });

    return sha;
  }

  async createOrUpdateFile(
    owner: string,
    repo: string,
    branch: string,
    path: string,
    content: string,
    message: string,
    sha?: string,
  ): Promise<CreateUpdateContent> {
    const { data } = await this.githubAPI.rest.repos.createOrUpdateFileContents({
      owner,
      repo,
      path,
      message,
      content,
      sha,
      branch,
    });

    return data
  }

  async getHashes(
    owner: string,
    repository: string,
    branch: string,
    limit: number = 10,
  ): Promise<string[]> {
    const { data } = await this.githubAPI.rest.repos.listCommits({
      owner,
      repo: repository,
      sha: branch,
      per_page: limit,
    });

    return data.map(commit => commit.sha);
  }

  async runQuery(
    query: string,
    variables: any,
  ): Promise<any> {
    const data = await this.githubAPI.request('POST /graphql', {
      query,
      variables,
    });

    return data;
  }
}
