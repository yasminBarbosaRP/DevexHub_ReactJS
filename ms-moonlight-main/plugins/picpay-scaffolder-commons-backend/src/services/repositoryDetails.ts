import { GithubRepository } from '../repositories/github';
import { RepositoryDetails } from '../interfaces/githubRepository';

export class GithubRepositoryService {
  private readonly githubRepository: GithubRepository;
  constructor(githubRepository: GithubRepository) {
    this.githubRepository = githubRepository;
  }

  async getRepositoryDetails(
    owner: string,
    repository: string,
  ): Promise<RepositoryDetails> {
    const files = await this.githubRepository.getFiles(owner, repository);
    const settings = await this.githubRepository.getSettings(owner, repository);

    return {
      repository,
      files,
      settings,
    };
  }

  async getFileContents(
    owner: string,
    repository: string,
    filepath: string,
  ): Promise<string> {
    const contents = await this.githubRepository.getContent(
      owner,
      repository,
      filepath,
    );
    if (!contents.content) {
      throw new Error('File is empty');
    }

    return contents.content;
  }
}
