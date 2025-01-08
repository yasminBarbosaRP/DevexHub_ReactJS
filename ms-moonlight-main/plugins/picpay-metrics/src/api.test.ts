import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { MetricsApiClient } from './api';
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

const mockAxios = new MockAdapter(axios);

describe('MetricsApiClient', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let metricsApi: MetricsApiClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('/api/metrics/service/'),
    } as unknown as ConfigApi;
    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;
    metricsApi = new MetricsApiClient({ configApi, identityApi });
  });

  afterEach(() => {
    mockAxios.reset();
  });

  it('should fetch data successfully when get metrics by service', async () => {
    const data = {
      id: 'testuser',
      groups: ['group1', 'group2'],
    };
    mockAxios
      .onGet(
        '/api/metrics/service/your-service-name',
        {
          params: {
            startDate: new Date('2022-01-01'),
            endDate: new Date('2022-01-31'),
            exhibition: 'DAY',
          },
        },
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }
      )
      .reply(200, data);

    const result = await metricsApi.getMetricsByService('your-service-name', {
      startDate: new Date('2022-01-01'),
      endDate: new Date('2022-01-31'),
      exhibition: 'DAY',
    });

    expect(result).toEqual(data);
  });

  it('should fetch data successfully when get metrics by group', async () => {
    const data = {
      id: 'testuser',
      groups: ['group1', 'group2'],
    };
    mockAxios
      .onGet(
        '/api/metrics/group',
        {
          params: {
            startDate: new Date('2022-01-01'),
            endDate: new Date('2022-01-31'),
            exhibition: 'DAY',
            ownerNames: ['owner1', 'owner2'],
            entityName: 'your-entity-name',
          },
        },
        {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-token',
        }
      )
      .reply(200, data);

    const result = await metricsApi.getMetricsByGroup(
      ['owner1', 'owner2'],
      'your-entity-name',
      {
        startDate: new Date('2022-01-01'),
        endDate: new Date('2022-01-31'),
        exhibition: 'DAY',
      }
    );

    expect(result).toEqual(data);
  });
});
