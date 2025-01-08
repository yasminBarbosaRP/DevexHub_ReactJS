import React from 'react';
import { render } from '@testing-library/react';
import { UserGroupsProvider, UserGroupsContext } from './UserGroupsContext';

test('Shoud renders UserGroupsProvider with UserGroupsContext', () => {
  const { container } = render(
    <UserGroupsProvider>
      <UserGroupsContext.Consumer>
        {context => {
          expect(context.userGroups).toBe(null);
          expect(typeof context.setUserGroups).toBe('function');
          return null;
        }}
      </UserGroupsContext.Consumer>
    </UserGroupsProvider>
  );

  expect(container).toBeDefined();
});
