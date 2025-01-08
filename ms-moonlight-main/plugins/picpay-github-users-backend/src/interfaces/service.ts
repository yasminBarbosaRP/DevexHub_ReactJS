import { RequestModel } from '../models/request';
import { UserInfo } from '../models/response';

export interface UserService {
  getUser(request: RequestModel): Promise<UserInfo>;
}

export interface GroupsService {
  getUserGroups(username: string): Promise<string[]>;
}
