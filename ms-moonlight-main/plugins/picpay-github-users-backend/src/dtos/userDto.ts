import { UserInfo, UserResponse } from '../models/response';
import { Entity, parseEntityRef } from '@backstage/catalog-model';

export function UserDTO(userInfo: UserInfo, groups: string[]): UserResponse {
  return {
    user_id: userInfo.user_id,
    personal_email: userInfo.personal_email,
    username: userInfo.username,
    sso_email: userInfo.sso_email,
    joined_at: userInfo.joined_at,
    removed_at: userInfo.removed_at,
    is_on_org: userInfo.is_on_org,
    groups: groups,
  };
}

export function UserEntityDTO(userInfo: Entity): UserResponse {
  return {
    user_id: userInfo.metadata.uid ?? '',
    personal_email: (userInfo.spec?.profile as any)?.email ?? '',
    username: userInfo.metadata.name,
    sso_email: (userInfo.spec?.profile as any)?.email ?? '',
    groups:
      userInfo.relations
        ?.filter(relation => relation.targetRef.startsWith('group'))
        .map(relation => {
          const { name } = parseEntityRef(relation.targetRef);
          return name;
        }) ?? [],
  };
}
