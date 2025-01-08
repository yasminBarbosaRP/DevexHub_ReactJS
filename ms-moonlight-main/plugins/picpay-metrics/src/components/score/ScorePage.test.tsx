import { renderInTestApp } from '@backstage/frontend-test-utils';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { TestApiProvider } from '@backstage/test-utils';
import { screen, waitFor } from '@testing-library/react';
import React, { act } from 'react';
import { ScorePage } from './ScorePage';
import '@testing-library/jest-dom/extend-expect';
import { visionApiRef } from '@internal/plugin-picpay-vision';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import { fireEvent } from '@testing-library/react';



const mockCatalogApi = {
  getEntities: jest.fn().mockResolvedValue({ items: [] }),
};

const mockVisionApi = {
  getScoreTestMetricsDetails: jest.fn().mockResolvedValue({
    projects: [
      {
        squad: 'Time A',
        name: 'Service A',
        metrics: [
          { name: 'sonar', pass: true },
          { name: 'canary', pass: false },
          { name: 'mutation', pass: true },
          { name: 'endtoend', pass: false },
        ],
      },
    ],
  }),
};

const renderComponent = async (props = {}) => {
  await act(async () => {
    await renderInTestApp(
      <TestApiProvider apis={[[catalogApiRef, mockCatalogApi], [visionApiRef, mockVisionApi]]}>
        <UserGroupsContext.Provider
          value={{
            userGroups: [{ label: 'group-a', ref: 'ref-group-a', type: 'team', children: [], isOwnerOfEntities: false }],
            userInfo: {
              apiVersion: 'v1',
              kind: 'User',
              metadata: { name: 'test-user', namespace: 'default' },
            },
            setUserGroups: jest.fn(),
            setUserInfo: jest.fn(),
          }}
        >
          <ScorePage {...props} />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );
  });
};

describe('ScorePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the GuardRailTable with fetched metrics data', async () => {
    await renderComponent();
  
    expect(screen.getByText('Guard Rails')).toBeInTheDocument();
  
    await waitFor(() => {
      expect(screen.getByText('Service A')).toBeInTheDocument();
    });
  
    await waitFor(() => {
      expect(screen.getByTestId('sonar-close-icon')).toBeInTheDocument();
    });
  });

  it('renders the filters and reacts to selection changes', async () => {
    const onFilterChange = jest.fn();
  
    await renderComponent({ onFilterChange });
  
    const [firstTimeElement] = screen.getAllByText('Squad');
    expect(firstTimeElement).toBeInTheDocument();
  
    const dropdownButton = screen.getByLabelText('Open');
    fireEvent.click(dropdownButton);
  });
  

  it('renders empty state when no data is fetched', async () => {
    mockVisionApi.getScoreTestMetricsDetails.mockResolvedValueOnce({ projects: [] });
  
    await renderComponent();

    screen.debug();
  
    await waitFor(() => {
      const rows = screen.queryAllByTestId('table-row');
      expect(rows).toHaveLength(0);
    });
  });

  it('renders without crashing', async () => {
    await renderComponent();
    const titleElement = screen.getByText('Guard Rails');
    expect(titleElement).toBeInTheDocument();
  });
  it('renders the SonarMetrics and MutationMetrics components', async () => {
    await renderComponent();
  
    await waitFor(() => {
      expect(screen.getByTestId('sonar-metrics')).toBeInTheDocument();
      expect(screen.getByTestId('mutation-metrics')).toBeInTheDocument();
    });
  });
  });

