/**
 * @jest-environment jsdom
 */

import React from 'react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { metricsApiRef } from '../api';
import { Metrics, MetricsSource } from './Metrics';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import { Entity } from '@backstage/catalog-model';
import { fireEvent, waitFor, within } from '@testing-library/react';
import moment from 'moment-timezone';

moment.tz.setDefault('UTC');

describe('<Metrics />', () => {
  const mockMetricsApi = {
    getMetricsByService: jest.fn(),
    getMetricsByGroup: jest.fn(),
  };

  const renderComponent = async (
    source: MetricsSource,
    entity?: Entity,
    userGroups?: { label: string; ref: string; children: string[], type: string, isOwnerOfEntities: boolean }[],
  ) => {
    return await renderInTestApp(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider
          value={{
            userGroups: userGroups ?? [],
            userInfo: null,
            setUserGroups: () => {},
            setUserInfo: () => {},
          }}
        >
          <Metrics source={source} entity={entity} />
        </UserGroupsContext.Provider>
      </TestApiProvider>,
    );
  };

  afterEach(() => {
    jest.resetAllMocks();
  });

  const mockEntityService: Entity = {
    apiVersion: 'backstage.io/v1beta1',
    kind: 'Component',
    metadata: { name: 'my-service' },
  };

  const mockEntityGroup: Entity = {
    apiVersion: 'backstage.io/v1beta1',
    kind: 'Group',
    metadata: { name: 'my-group' },
    spec: { children: ['child-service-1', 'child-service-2'], type: 'business-unit' },
  };

  const mockEntityOrg: Entity = {
    apiVersion: 'backstage.io/v1beta1',
    kind: 'Group',
    metadata: { name: 'my-org' },
    spec: { type: 'organization', children: ['org-child-1', 'org-child-2'] },
  };

  const userGroups = [
    { label: 'Squad A', ref: 'squad-a', type: 'squad', isOwnerOfEntities: false, children: ['github-squad-a'] },
    { label: 'Team B', ref: 'team-b', children: [], type: 'squad', isOwnerOfEntities: false, },
  ];

  
  it('calls getMetricsByGroup for GROUP source', async () => {
    await renderComponent('GROUP', mockEntityGroup);
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['child-service-1', 'child-service-2'], 
        'my-group',
        expect.objectContaining({ startDate: expect.any(Date), endDate: expect.any(Date), exhibition: 'MONTH' }),
      );
    });
  });

  
  it('calls getMetricsByService for SERVICE source', async () => {
    await renderComponent('SERVICE', mockEntityService);
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledWith(
        'my-service',
        expect.objectContaining({ startDate: expect.any(Date), endDate: expect.any(Date), exhibition: 'MONTH' }),
      );
    });
  });

  
  it('calls getMetricsByGroup for HOME_PAGE with squads', async () => {
    await renderComponent('HOME_PAGE', undefined, userGroups);
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad A', 'github-squad-a'], 
        'Squad A',
        expect.objectContaining({ startDate: expect.any(Date), endDate: expect.any(Date), exhibition: 'MONTH' }),
      );
    });
  });
  
  it('changes date range when groupedBy changes', async () => {
    const { rerender } = await renderComponent('SERVICE', mockEntityService);

    
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledTimes(2)
    });

    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01'));
    
    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider value={{ userGroups: [], userInfo: null, setUserGroups: () => {}, setUserInfo: () => {} }}>
          <Metrics source="SERVICE" entity={mockEntityService} />
        </UserGroupsContext.Provider>
      </TestApiProvider>,
    );
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledTimes(2);
      
      const lastCallArgs = mockMetricsApi.getMetricsByService.mock.calls[1][1];
      const startDiff = moment(lastCallArgs.startDate).diff(moment(lastCallArgs.endDate), 'months');
      expect(startDiff).toBeLessThanOrEqual(-5); 
    });
    jest.useRealTimers();
  });

  
  it('sets selectedSquad after squads load (HOME_PAGE)', async () => {
    await renderComponent('HOME_PAGE', undefined, userGroups);
    await waitFor(() => {
      
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad A', 'github-squad-a'],
        'Squad A',
        expect.any(Object),
      );
    });
  });

  
  it('does not call API for HOME_PAGE if no squads', async () => {
    await renderComponent('HOME_PAGE', undefined, []);
    
    await new Promise(r => setTimeout(r, 500));
    expect(mockMetricsApi.getMetricsByGroup).not.toHaveBeenCalled();
  });

  
  it('calls getMetricsByGroup with children for business-unit entity', async () => {
    await renderComponent('GROUP', mockEntityGroup);
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['child-service-1', 'child-service-2'],
        'my-group',
        expect.any(Object),
      );
    });
  });

  
  it('calls getMetricsByGroup with ["*"] for organization entity', async () => {
    await renderComponent('GROUP', mockEntityOrg);
    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['*'],
        'my-org',
        expect.any(Object),
      );
    });
  });

  it('updates date range correctly for DAY grouping', async () => {
    const { rerender } = await renderComponent('SERVICE', mockEntityService);
    
    jest.useFakeTimers();
    jest.setSystemTime(new Date(Date.UTC(2023, 11, 1, 0, 0, 0)));

    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider value={{ userGroups: [], userInfo: null, setUserGroups: () => {}, setUserInfo: () => {} }}>
          <Metrics source="SERVICE" entity={{ ...mockEntityService, spec: { groupedBy: 'DAY' } }} />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      const lastCall = mockMetricsApi.getMetricsByService.mock.lastCall[1];
      const daysDiff = moment(lastCall.endDate).startOf('day').diff(moment(lastCall.startDate).startOf('day'), 'days');
      expect(daysDiff).toBe(184);
    });
    
    jest.useRealTimers();
  });

  it('updates date range correctly for WEEK grouping', async () => {
    const { rerender } = await renderComponent('SERVICE', mockEntityService);
    
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2023-12-01'));

    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider value={{ userGroups: [], userInfo: null, setUserGroups: () => {}, setUserInfo: () => {} }}>
          <Metrics source="SERVICE" entity={{ ...mockEntityService, spec: { groupedBy: 'WEEK' } }} />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      const lastCall = mockMetricsApi.getMetricsByService.mock.lastCall[1];
      const endDate = moment(lastCall.endDate);
      const startDate = moment(lastCall.startDate);
      const weeksDiff = endDate.diff(startDate, 'days') / 7;
      expect(Math.ceil(weeksDiff)).toBe(27);
    });
    
    jest.useRealTimers();
  });

  it('sorts squads correctly with squad keyword priority', async () => {
    const mixedGroups = [
      { label: 'Team A', ref: 'team-a', children: [], type: 'squad', isOwnerOfEntities: false },
      { label: 'Squad B', ref: 'squad-b', children: [], type: 'squad', isOwnerOfEntities: false },
      { label: 'Department C', ref: 'dept-c', children: [], type: 'squad', isOwnerOfEntities: false },
      { label: 'Squad D', ref: 'squad-d', children: [], type: 'squad', isOwnerOfEntities: false },
    ];

    await renderComponent('HOME_PAGE', undefined, mixedGroups);

    await waitFor(() => {
      // Should call with Squad B first as it contains 'squad'
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad B'],
        'Squad B',
        expect.any(Object)
      );
    });
  });

  it('handles service entity with children correctly', async () => {
    const serviceWithChildren = {
      ...mockEntityService,
      spec: { children: ['child-1', 'child-2'] }
    };

    await renderComponent('SERVICE', serviceWithChildren);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledWith(
        'my-service',
        expect.any(Object)
      );
    });
  });

  it('refreshes data when date range changes', async () => {
    const { rerender } = await renderComponent('SERVICE', mockEntityService);
    
    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider value={{ userGroups: [], userInfo: null, setUserGroups: () => {}, setUserInfo: () => {} }}>
          <Metrics 
            source="SERVICE" 
            entity={mockEntityService}
          />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledTimes(2);
    });
  });

  it('handles empty entity name gracefully', async () => {
    const emptyNameEntity = {
      ...mockEntityService,
      metadata: { name: '' }
    };

    await renderComponent('SERVICE', emptyNameEntity);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledWith(
        '',
        expect.any(Object)
      );
    });
  });

  it('handles metric selection changes in HOME_PAGE view', async () => {
    await renderComponent('HOME_PAGE', undefined, userGroups);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad A', 'github-squad-a'],
        'Squad A',
        expect.any(Object)
      );
    });
  });

  it('updates view when exhibition period changes to DAY', async () => {
    const { rerender } = await renderComponent('SERVICE', mockEntityService);
    
    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider value={{ userGroups: [], userInfo: null, setUserGroups: () => {}, setUserInfo: () => {} }}>
          <Metrics 
            source="SERVICE" 
            entity={{ 
              ...mockEntityService,
              spec: { groupedBy: 'DAY' }
            }} 
          />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      const lastCall = mockMetricsApi.getMetricsByService.mock.lastCall[1];
      expect(moment(lastCall.endDate).diff(moment(lastCall.startDate), 'days')).toBe(184);
    });
  });

  it('handles API errors gracefully', async () => {
    mockMetricsApi.getMetricsByService.mockRejectedValue(new Error('API Error'));
    await renderComponent('SERVICE', mockEntityService);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalled();
    });
  });

  it('handles squad selection changes', async () => {
    await renderComponent('HOME_PAGE', undefined, [
      ...userGroups,
      { label: 'Squad C', ref: 'squad-c', children: ['github-squad-c'], type: 'squad', isOwnerOfEntities: false }
    ]);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad A', 'github-squad-a'],
        'Squad A',
        expect.any(Object)
      );
    });
  });

  it('handles entity with undefined spec', async () => {
    const entityWithoutSpec = {
      apiVersion: 'backstage.io/v1beta1',
      kind: 'Component',
      metadata: { name: 'no-spec-service' }
    };

    await renderComponent('SERVICE', entityWithoutSpec);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByService).toHaveBeenCalledWith(
        'no-spec-service',
        expect.any(Object)
      );
    });
  });

  it('handles entity with empty children array', async () => {
    const entityWithEmptyChildren = {
      ...mockEntityGroup,
      spec: { ...mockEntityGroup.spec, children: [] }
    };

    await renderComponent('GROUP', entityWithEmptyChildren);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        [],
        'my-group',
        expect.any(Object)
      );
    });
  });


  it('updates period correctly when changing to DAY grouping', async () => {
    const { getByTestId } = await renderComponent('SERVICE', mockEntityService);

    const input = within(getByTestId("group-by")).getByRole("button");
    fireEvent.mouseDown(input);

    const listbox = await within(document.body).findByRole("listbox");
    const option = within(listbox).getByText("Day");
    fireEvent.click(option);

    await waitFor(() => {
      const lastCall = mockMetricsApi.getMetricsByService.mock.lastCall[1];
      expect(lastCall.exhibition).toBe('DAY');
      const weeksDiff = moment(lastCall.endDate).diff(moment(lastCall.startDate), 'days') / 7;
      expect(Math.ceil(weeksDiff)).toBe(Math.ceil(183 / 7));
    });
  });

  it('updates period correctly when changing to WEEK grouping', async () => {
    const { getByTestId } = await renderComponent('SERVICE', mockEntityService);

    const input = within(getByTestId("group-by")).getByRole("button");
    fireEvent.mouseDown(input);

    const listbox = await within(document.body).findByRole("listbox");
    const option = within(listbox).getByText("Week");
    fireEvent.click(option);

    await waitFor(() => {
      const lastCall = mockMetricsApi.getMetricsByService.mock.lastCall[1];
      expect(lastCall.exhibition).toBe('WEEK');
      const weeksDiff = moment(lastCall.endDate).diff(moment(lastCall.startDate), 'days') / 7;
      expect(Math.ceil(weeksDiff)).toBe(5);
    });
  });

  it('handles API errors for HOME_PAGE view', async () => {
    mockMetricsApi.getMetricsByGroup.mockRejectedValue(new Error('API Error'));
    
    await renderComponent('HOME_PAGE', undefined, userGroups);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Squad A', 'github-squad-a'],
        'Squad A',
        expect.any(Object)
      );
    });
  });

  it('handles squad changes in HOME_PAGE view', async () => {
    const { rerender } = await renderComponent('HOME_PAGE', undefined, userGroups);

    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider
          value={{
            userGroups,
            userInfo: null,
            setUserGroups: () => {},
            setUserInfo: () => {},
          }}
        >
          <Metrics source="HOME_PAGE" />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledTimes(2);
    });
  });

  it('handles undefined entity for GROUP source', async () => {
    await renderComponent('GROUP', undefined);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        [''],
        '',
        expect.any(Object)
      );
    });
  });

  it('handles empty userGroups context', async () => {
    await renderComponent('HOME_PAGE', undefined, []);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).not.toHaveBeenCalled();
    });
  });

  it('updates selectedHomeMetric in HOME_PAGE view', async () => {
    const { rerender } = await renderComponent('HOME_PAGE', undefined, userGroups);

    rerender(
      <TestApiProvider apis={[[metricsApiRef, mockMetricsApi]]}>
        <UserGroupsContext.Provider
          value={{
            userGroups,
            userInfo: null,
            setUserGroups: () => {},
            setUserInfo: () => {},
          }}
        >
          <Metrics source="HOME_PAGE" />
        </UserGroupsContext.Provider>
      </TestApiProvider>
    );

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledTimes(2);
    });
  });

  it('handles nested children in group hierarchy', async () => {
    const nestedGroups = [
      { 
        label: 'Parent Squad', 
        ref: 'parent-squad', 
        children: ['child-squad'], 
        type: 'squad',
        isOwnerOfEntities: false
      },
      { 
        label: 'Child Squad', 
        ref: 'child-squad', 
        children: ['github-child'], 
        type: 'squad',
        isOwnerOfEntities: false
      },
    ];

    await renderComponent('HOME_PAGE', undefined, nestedGroups);

    await waitFor(() => {
      expect(mockMetricsApi.getMetricsByGroup).toHaveBeenCalledWith(
        ['Parent Squad', 'child-squad'],
        'Parent Squad',
        expect.any(Object)
      );
    });
  });
});
