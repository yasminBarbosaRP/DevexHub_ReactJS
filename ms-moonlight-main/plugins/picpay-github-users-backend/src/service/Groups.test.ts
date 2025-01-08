import { GroupsService } from './Groups';
import { GroupsRepository } from '../interfaces/repository';

jest.mock('../interfaces/repository');

describe('GroupsService', () => {
  let service: GroupsService;
  let mockRepo: jest.Mocked<GroupsRepository>;

  beforeEach(() => {
    mockRepo = {
      getUserGroups: jest.fn(),
    } as jest.Mocked<GroupsRepository>;
    service = new GroupsService(mockRepo);
  });

  it('should return user groups', async () => {
    const mockGroups = ['group1', 'group2'];
    mockRepo.getUserGroups.mockResolvedValue({
      apiVersion: 'v1',
      kind: 'Entity',
      metadata: { name: 'testName' },
      spec: { memberOf: mockGroups }
    });

    const result = await service.getUserGroups('testUser');
    expect(result).toEqual(mockGroups);
  })
});