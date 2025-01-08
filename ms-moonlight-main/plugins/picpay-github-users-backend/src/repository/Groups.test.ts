import axios from 'axios';
import { ConfigApi } from '@backstage/core-plugin-api';
import { GroupsRepository } from './Groups';
import MockAdapter from 'axios-mock-adapter';

const mock = new MockAdapter(axios);

// Respond with an entity object
mock.onGet('/api/catalog/entities/by-name/user/default/testuser').reply(200, {
  id: 'testuser',
  groups: ['group1', 'group2']
});

describe('github-users-backend:GroupsRepository', () => {
  let config: ConfigApi;
  let repository: GroupsRepository;

  beforeEach(() => {
    config = { getString: jest.fn().mockReturnValue('http://localhost') } as unknown as ConfigApi;
    repository = new GroupsRepository(config);
  });

  it('getUserGroups should return user groups', async () => {
    const username = 'testuser';
    const response = await repository.getUserGroups(username);
    expect(response).toEqual({ id: 'testuser', groups: ['group1', 'group2'] });
  });
});