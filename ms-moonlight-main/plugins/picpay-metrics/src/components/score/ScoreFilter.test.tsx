import { renderInTestApp } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TestApiProvider } from '@backstage/test-utils';
import { fireEvent, screen } from '@testing-library/react';
import React, { act } from 'react';
import ScoreFilters from './ScoreFilter';

jest.mock('@backstage/core-components', () => ({
  GitHubIcon: () => <div data-testid="gh-icon" />,
}));

const mockCatalogApi = {
  getEntities: jest.fn().mockResolvedValue({
    items: [
      { metadata: { name: 'test-owner', namespace: 'default' }, kind: 'Group' },
      { metadata: { name: 'initial-owner', namespace: 'default' }, kind: 'Group' }
    ]
  })
};

const renderComponent = async (props = {}) => {
  await act(async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi]]}>
        <ScoreFilters {...props} />
      </TestApiProvider>
    );
  })
};

describe('ScoreFilters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', async () => {
    await renderComponent();
    expect(screen.getByText('Squad')).toBeInTheDocument();
  });

  it('loads and displays entities', async () => {
    await renderComponent();
    const button = screen.getByLabelText('Open');
    fireEvent.click(button);

    expect(screen.getByText('test-owner')).toBeInTheDocument();
  });

  it('handles owner selection correctly', async () => {
    const onOwnerSelect = jest.fn();
    await renderComponent({ onOwnerSelect });

    const button = screen.getByLabelText('Open')
    fireEvent.click(button);
    fireEvent.click(screen.getByText('test-owner'));

    expect(onOwnerSelect).toHaveBeenCalledWith('test-owner');
  });

  it('displays initial owner when provided', async () => {
    await renderComponent({ initialOwner: 'initial-owner' });
    expect(screen.getByDisplayValue('initial-owner')).toBeInTheDocument();
  });

  it('handles empty selection correctly', async () => {
    const onOwnerSelect = jest.fn();
    await renderComponent({ onOwnerSelect });

    const button = screen.getByLabelText('Clear');
    fireEvent.click(button);

    expect(onOwnerSelect).toHaveBeenCalledWith(null);
  });
});