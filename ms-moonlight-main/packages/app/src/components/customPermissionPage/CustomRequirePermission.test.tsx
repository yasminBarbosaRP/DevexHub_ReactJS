/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { CustomRequirePermission } from './CustomRequirePermission';
import { usePermission } from '@backstage/plugin-permission-react';
import { renderInTestApp } from '@backstage/test-utils';
import { createPermission } from '@backstage/plugin-permission-common';

jest.mock('@backstage/plugin-permission-react', () => ({
  usePermission: jest.fn(),
}));

const mockUsePermission = usePermission as jest.MockedFunction<
  typeof usePermission
>;

const permission = createPermission({
  name: 'access.something',
  attributes: { action: 'read' },
});

const resourcePermission = createPermission({
  name: 'access.something',
  attributes: { action: 'read' },
  resourceType: 'test-resource',
});

describe('RequirePermission', () => {
  it('Does not render when loading', async () => {
    mockUsePermission.mockReturnValue({ loading: true, allowed: false });

    const { queryByText } = await renderInTestApp(
      <CustomRequirePermission
        permission={permission}
        children={<div>content</div>}
      />,
    );

    expect(queryByText('content')).not.toBeTruthy();
  });

  it('Renders given element if authorized', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: true });

    const { getByText } = await renderInTestApp(
      <CustomRequirePermission
        permission={permission}
        children={<div>content</div>}
      />,
    );

    expect(getByText('content')).toBeTruthy();
  });

  it('Renders without permition to access page', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: false });

    const { getByText } = await renderInTestApp(
      <CustomRequirePermission
        permission={permission}
        children={<div>content</div>}
      />);

    expect(getByText("You don't have permission to access this page")).toBeInTheDocument();
  });

  it('Renders custom error page if not authorized', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: false });

    const { getByText } = await renderInTestApp(
      <CustomRequirePermission
        permission={permission}
        children={<div>content</div>}
        errorPage={<h1>Custom Error</h1>}
      />,
    );

    expect(getByText('Custom Error')).toBeTruthy();
  });

  it('Can authorize with a resource permission', async () => {
    mockUsePermission.mockReturnValue({ loading: false, allowed: true });

    const { getByText } = await renderInTestApp(
      <CustomRequirePermission
        permission={resourcePermission}
        resourceRef="my-test-resource"
        children={<div>content</div>}
      />,
    );

    expect(getByText('content')).toBeTruthy();
  });
});
