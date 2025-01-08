import React from 'react';
import { EntityProvider } from '@backstage/plugin-catalog-react';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { ManagerTemplateVersion } from './ManagerTemplateVersion';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { ManageTemplateVersionApiRef } from '../../api';
import { refreshStateApiRef } from '@internal/plugin-picpay-entity-refresh-status';

describe('ManagerTemplateVersionFrontend', () => {
  let render: any;

  const mockApi: jest.Mocked<typeof ManageTemplateVersionApiRef.T> = {
    update: jest.fn().mockReturnValue(Promise.resolve()),
  };

  const mockRefreshApi: jest.Mocked<typeof refreshStateApiRef.T> = {
    forceRefresh: jest.fn(),
    getEntityRefreshState: jest.fn(),
  };

  const defaultEntity = {
    apiVersion: 'backstage.io/v1alpha1',
    kind: 'Component',
    metadata: {
      name: 'test-name',
      namespace: 'namespace',
      annotations: {
        'github.com/project-slug': 'PicPay/test-slug',
      }
    },
    spec: {
      type: 'service',
    }
  };

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestApiProvider apis={
      [
        [ManageTemplateVersionApiRef, mockApi],
        [refreshStateApiRef, mockRefreshApi]
      ]}>
      <EntityProvider entity={defaultEntity}>
        {children}
      </EntityProvider>
    </TestApiProvider>
  );

  it('updates the template version on submit', async () => {
    render = await renderInTestApp(
      <Wrapper>
        <ManagerTemplateVersion />
      </Wrapper>
    );

    act(() => {
      const text = render.getByPlaceholderText('Insert the commit hash');
      fireEvent.change(text, { target: { value: 'test-hash' } });
    });

    act(() => {
      fireEvent.click(render.getByTestId('test-button-submit'));
    });

    await waitFor(() => {
      expect(mockApi.update).toHaveBeenCalledWith({
        hash: 'test-hash',
        name: 'test-name',
        repository: 'test-slug',
        branch: 'main',
      });
    });
  });

});