import { UserRepository } from '../interfaces/repository';
import { UserService as Service } from '../interfaces/service';
import { RequestModel } from '../models/request';
import { UserInfo } from '../models/response';
import { NoResultError } from '../types/errors';

export class UserService implements Service {
  repo: UserRepository;

  constructor(repo: UserRepository) {
    this.repo = repo;
  }

  async getUser(request: RequestModel): Promise<UserInfo> {
    const res = await this.repo.getUser(request);
    if (res.data.length === 0)
      throw new NoResultError('no user found for this request');
    return Promise.resolve(res.data[0]);
  }
}
