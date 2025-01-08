import { renderInTestApp } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TestApiProvider } from '@backstage/test-utils';
import { pullRequestsApiRef } from '@internal/plugin-picpay-metrics';
import { screen } from '@testing-library/react';
import React, { act } from 'react';
import { MetricsPage } from './MetricsPage';

jest.mock('@internal/plugin-picpay-houston', () => ({
  ...jest.requireActual('@internal/plugin-picpay-houston'),
  useHoustonContext: () => ({
    show_score_tab: true
  }),
}));

const mockPullRequestApi = {
  getPullRequests: jest.fn().mockResolvedValue({
      openPullRequests: 0,
      closedPullRequests: 0,
      mergedPullRequests: 0,
      otherTeamsOpenPullRequests: 0,
      averageFilesChanged: 0,
      averageOpenTime: 0,
      averageTimeToStartReview: 0,
      averageTimeToRequiredReview: 0,
      pullRequests: []
  }),
};

const mockCatalogApi = {
  getEntities: jest.fn().mockResolvedValue({
    items: []
  })
};
const renderComponent = async (props = {}) => {
  await act(async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[pullRequestsApiRef, mockPullRequestApi], [catalogApiRef, mockCatalogApi]]}>
        <MetricsPage {...props} />
      </TestApiProvider>
    );
  })
};

describe('MetricsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders tab Pull Requests', async () => {
    await renderComponent();
    expect(screen.getByRole('tab', { name: 'Pull Requests' })).toBeInTheDocument();
  });

  it('renders without crashing', async () => {
    await renderComponent();
    expect(screen.getByRole('tab', { name: 'Test Certified' })).toBeInTheDocument();
  });


});