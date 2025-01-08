import { renderInTestApp } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TestApiProvider } from '@backstage/test-utils';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { EntityPicker } from './EntityPicker';

const mockCatalogApi = {
  getEntities: jest.fn().mockResolvedValue({
    items: []
  })
};
const renderComponent = async (props: {type: 'owner' | 'service', label?: string} = { type: 'owner' }) => {
  await act(async () => {
    return renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <EntityPicker {...props} />
      </TestApiProvider>
    );
  })
};

describe('ScorePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });


  it('renders without crashing', async () => {
    await renderComponent();
    expect(screen.getByText('Owner')).toBeInTheDocument();
  });

  it('renders with specific label', async () => {
    await renderComponent({ type: 'owner', label: 'My custom Label'});
    expect(screen.getByText('My custom Label')).toBeInTheDocument();
  });

});