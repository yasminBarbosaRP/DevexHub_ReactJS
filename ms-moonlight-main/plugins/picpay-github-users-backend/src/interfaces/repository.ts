import { RequestModel } from '../models/request';
import { ResponseModel } from '../models/response';
import { Entity } from '@backstage/catalog-model';

export interface UserRepository {
  getUser(request: RequestModel): Promise<ResponseModel>;
}

export interface GroupsRepository {
  getUserGroups(username: string): Promise<Entity>;
}
