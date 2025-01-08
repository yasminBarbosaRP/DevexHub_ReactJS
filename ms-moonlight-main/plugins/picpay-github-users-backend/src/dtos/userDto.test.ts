import { UserDTO, UserEntityDTO } from './userDto';
import { Entity } from '@backstage/catalog-model';

describe('UserDTO', () => {
  it('should return a UserDTO object', () => {
    const userInfo = {
      id: '1',
      user_id: '1',
      personal_email: 'test@example.com',
      username: 'testuser',
      sso_email: 'test@example.com',
      joined_at: "2021-08-02",
      removed_at: null,
      is_on_org: true,
      last_update: "2021-08-02",
      first_collaboration: {
        commit: null,
        commit_id: null,
        commit_date: null,
        deploy_date: null,
        service: null,
      },
    };
    const groups = ['group1', 'group2'];

    const result = UserDTO(userInfo, groups);

    expect(result).toEqual({
        user_id: userInfo.user_id,
        personal_email: userInfo.personal_email,
        username: userInfo.username,
        sso_email: userInfo.sso_email,
        joined_at: userInfo.joined_at,
        removed_at: userInfo.removed_at,
        is_on_org: userInfo.is_on_org,
        groups,
    });
  });
});

describe('UserEntityDTO', () => {
  it('should return a UserEntityDTO object', () => {
    const userInfo: Entity = {
      apiVersion: '1',
      kind: 'User',
      metadata: {
        name: 'testuser',
        uid: '1',
      },
      spec: {
        profile: {
          email: 'test@example.com',
        },
      },
      relations: [
        {
          type: 'memberOf',
          targetRef: 'group:default/group1',
        },
        {
          type: 'memberOf',
          targetRef: 'group:default/group2',
        },
      ],
    };

    const result = UserEntityDTO(userInfo);

    expect(result).toEqual({
      user_id: '1',
      personal_email: 'test@example.com',
      username: 'testuser',
      sso_email: 'test@example.com',
      groups: ['group1', 'group2'],
    });
  });
});