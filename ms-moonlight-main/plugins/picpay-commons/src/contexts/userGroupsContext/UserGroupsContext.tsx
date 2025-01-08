import { Entity } from '@backstage/catalog-model';
import React, { useState, useMemo } from 'react';

export interface UserGroups {
  label: string;
  ref: string;
  type: string;
  children: string[];
  isOwnerOfEntities: boolean;
}

type UserGroupsContextType = {
  userGroups: UserGroups[] | null;
  userInfo: Entity | null;

  setUserGroups: (userGroups: UserGroups[]) => void;
  setUserInfo: (userInfo: Entity) => void;
};

export const UserGroupsContext = React.createContext<UserGroupsContextType>({
  userGroups: null,
  userInfo: null,
  setUserGroups: () => {},
  setUserInfo: () => {},

});

export const UserGroupsProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const [userGroups, setUserGroups] = useState<UserGroups[] | null>(null);
  const [userInfo, setUserInfo] = useState<Entity | null>(null);

  const userGroupsProviderValue = useMemo(
    () => ({ userGroups, setUserGroups , userInfo, setUserInfo}),
    [userGroups, setUserGroups, userInfo, setUserInfo],
  );


  return (
    <UserGroupsContext.Provider value={userGroupsProviderValue}>
      {children}
    </UserGroupsContext.Provider>
  );
};
