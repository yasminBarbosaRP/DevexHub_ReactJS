import axios, { AxiosInstance } from 'axios';
import qs from 'qs';

import { ConfigApi } from '@backstage/core-plugin-api';
import { UserRepository as Repository } from '../interfaces/repository';
import { RequestModel } from '../models/request';
import { ResponseModel } from '../models/response';

export class UsersRepository implements Repository {
  private readonly api: AxiosInstance;

  constructor(config: ConfigApi) {
    this.api = axios.create({
      baseURL: config.getString('apis.metrics'),
      // @ts-ignore
      paramsSerializer: params => {
        return qs.stringify(params, {
          arrayFormat: 'repeat',
          serializeDate: d => d.toISOString().substring(0, 10),
        });
      },
    });
  }

  async getUser(request: RequestModel): Promise<ResponseModel> {
    if (!request.username && !request.sso_email)
      throw new Error('both username and sso_email are empty');
    const { data } = await this.api.get<ResponseModel>('/v1/metrics/users', {
      params: request,
    });
    return data;
  }
}
