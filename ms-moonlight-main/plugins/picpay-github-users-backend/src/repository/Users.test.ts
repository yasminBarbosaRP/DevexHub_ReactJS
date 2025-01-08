import { ConfigApi } from '@backstage/core-plugin-api';
import { UsersRepository } from './Users';
import { RequestModel } from '../models/request';
import { ResponseModel } from '../models/response';
import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';

describe('UsersRepository', () => {
  let mockAxios: MockAdapter;
  let config: ConfigApi;
  let usersRepository: UsersRepository;

  beforeEach(() => {
    mockAxios = new MockAdapter(axios);
    config = { getString: jest.fn().mockReturnValue('http://localhost') } as unknown as ConfigApi;
    usersRepository = new UsersRepository(config);
  });

  afterEach(() => {
    mockAxios.reset();
  });

  it('should throw an error if both username and sso_email are empty', async () => {
    const request: RequestModel = { username: '', sso_email: '' };

    await expect(usersRepository.getUser(request)).rejects.toThrow('both username and sso_email are empty');
  });

  it('should return user data if the request is successful', async () => {
    const request: RequestModel = { username: 'test', sso_email: 'test@test.com' };
    const response: ResponseModel = { page: 1, has_next_page: true, data: [] };
    mockAxios.onGet('http://localhost/v1/metrics/users', { params: request }).reply(200, response);

    const result = await usersRepository.getUser(request);

    expect(result).toEqual(response);
  });
});
