import { GroupsRepository } from '../interfaces/repository';
import { GroupsService as Service } from '../interfaces/service';

export class GroupsService implements Service {
  repo: GroupsRepository;

  constructor(repo: GroupsRepository) {
    this.repo = repo;
  }

  async getUserGroups(username: string): Promise<string[]> {
    const apiRes = await this.repo.getUserGroups(username);
    return Promise.resolve(apiRes.spec?.memberOf as string[]);
  }
}
