import { UserService } from './User';
import { UserRepository } from '../interfaces/repository';
import { RequestModel } from '../models/request';
import { UserInfo } from '../models/response';
import { NoResultError } from '../types/errors';

describe('UserService', () => {
  let userService: UserService;
  let mockRepo: UserRepository;

  beforeEach(() => {
    mockRepo = {
      getUser: jest.fn()
    };
    userService = new UserService(mockRepo);
  });

  it('should return user info when user is found', async () => {
      const mockRequest: RequestModel = {};
      const mockResponse: UserInfo = { 
          id: '1',
          user_id: '123',
          personal_email: 'test@example.com',
          username: 'testuser',
          sso_email: 'test@example.com',
          joined_at: '2022-01-01',
          first_collaboration: {
              commit: null,
              commit_id: null,
              commit_date: null,
              deploy_date: null,
              service: {
                  id: null,
                  name: null
              }
          },
          removed_at: null,
          is_on_org: false,
          last_update: '2022-01-01',
      };

      (mockRepo.getUser as jest.Mock).mockResolvedValue({ data: [mockResponse] });

      const result = await userService.getUser(mockRequest);

      expect(result).toEqual(mockResponse);
      expect(mockRepo.getUser).toHaveBeenCalledWith(mockRequest);
  });

  it('should throw NoResultError when no user is found', async () => {
    const mockRequest: RequestModel = {};

    (mockRepo.getUser as jest.Mock).mockResolvedValue({ data: [] });

    await expect(userService.getUser(mockRequest)).rejects.toThrow(NoResultError);
    expect(mockRepo.getUser).toHaveBeenCalledWith(mockRequest);
  });
});