import {
  GithubRepository,
  Settings,
} from '@internal/plugin-picpay-scaffolder-commons-backend';

export default class GithubService {
  constructor(
    private readonly owner: string,
    private readonly repository: string,
    private readonly githubRepository: GithubRepository,
  ) {}

  public async getWebhooks(): Promise<Settings[]> {
    const webhooks = await this.githubRepository.getSettings(
      this.owner,
      this.repository,
    );

    return webhooks;
  }
}
