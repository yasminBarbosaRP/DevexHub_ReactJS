import axios, { AxiosInstance } from 'axios';
import qs from 'qs';

import { ConfigApi } from '@backstage/core-plugin-api';
import { GroupsRepository as Repository } from '../interfaces/repository';
import { Entity } from '@backstage/catalog-model';

export class GroupsRepository implements Repository {
  private readonly api: AxiosInstance;

  constructor(config: ConfigApi) {
    this.api = axios.create({
      baseURL: config.getString('backend.baseUrl'),
      // @ts-ignore
      paramsSerializer: params => {
        return qs.stringify(params, {
          arrayFormat: 'repeat',
          serializeDate: d => d.toISOString().substring(0, 10),
        });
      },
    });
  }

  async getUserGroups(username: string): Promise<Entity> {
    if (!username) throw new Error('username is required');
    const { data } = await this.api.get<Entity>(
      `/api/catalog/entities/by-name/user/default/${username}`,
    );
    return data;
  }
}
