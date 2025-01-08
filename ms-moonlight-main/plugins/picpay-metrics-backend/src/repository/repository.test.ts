import axios from 'axios';
import MockAdapter from 'axios-mock-adapter';
import { fetchMetrics, fetchPullRequest } from './repository';
import { ConfigReader } from '@backstage/config';
import { getVoidLogger } from '@backstage/backend-common';
import { CatalogClient } from '@backstage/catalog-client';

const mockAxios = new MockAdapter(axios);

describe('fetchMetrics', () => {
  afterEach(() => {
    mockAxios.reset();
  });
  it('should fetch metrics data correctly', async () => {
    const inicial_data = new Date('2022-01-01').toISOString();
    const final_data = new Date('2022-01-31').toISOString();
    mockAxios
      .onGet('http://api.example.com/v1/metrics/lead-time', {
        params: {
          ignore_first_deploy: true,
          median: true,
          detailed: true,
          start_date: inicial_data,
          end_date: final_data,
          exhibition: 'DAY',
          service_name: 'test-service',
          owner_name: ['owner1', 'owner2'],
        },
      })
      .reply(200, { leadTime: true });
    mockAxios
      .onGet('http://api.example.com/v1/metrics/deploy-frequency', {
        params: {
          detailed: true,
          start_date: inicial_data,
          end_date: final_data,
          exhibition: 'DAY',
          service_name: 'test-service',
          owner_name: ['owner1', 'owner2'],
        },
      })
      .reply(200, { deployFrequency: true });
    mockAxios
      .onGet('http://api.example.com/v1/metrics/cfr', {
        params: {
          detailed: true,
          start_date: inicial_data,
          end_date: final_data,
          exhibition: 'DAY',
          service_name: 'test-service',
          owner_name: ['owner1', 'owner2'],
        },
      })
      .reply(200, { cfr: true });

    const options = {
      config: new ConfigReader({
        apis: {
          metrics: 'http://api.example.com',
        },
      }),
      logger: getVoidLogger(),
      catalogApi: new CatalogClient({ discoveryApi: { getBaseUrl: () => Promise.resolve('http://example.com') } }),
    };

    const mockResponse = {
      leadTimeData: {
        leadTime: true,
      },
      deployFrequencyData: {
        deployFrequency: true,
      },
      cfrData: {
        cfr: true,
      },
    };

    const result = await fetchMetrics(options, {
      start_date: inicial_data,
      end_date: final_data,
      exhibition: 'DAY',
      service_name: 'test-service',
      owner_name: ['owner1', 'owner2'],
    });

    expect(result).toEqual(mockResponse);
  });
});

describe('fetchPullRequest', () => {
  afterEach(() => {
    mockAxios.reset();
  });

  it('should fetch pull request data successfully', async () => {
    const mockData = { id: 1, title: 'Test PR' };
    mockAxios.onGet('http://api.example.com/v1/metrics/pull-request').reply(200, mockData);

    const options = {
      config: new ConfigReader({
        apis: {
          metrics: 'http://api.example.com',
        },
      }),
      logger: getVoidLogger(),
      catalogApi: new CatalogClient({ discoveryApi: { getBaseUrl: () => Promise.resolve('http://example.com') } }),
    };

    const params = {
      service_name: 'test-service',
      owner_name: 'test-owner',
      start_date: new Date('2023-01-01').toISOString(),
      end_date: new Date('2023-01-31').toISOString(),
    };

    const result = await fetchPullRequest(options, params);

    expect(result).toEqual(mockData);
    expect(mockAxios.history.get[0].url).toBe('http://api.example.com/v1/metrics/pull-request');
  });

  it('should handle errors', async () => {
    mockAxios.onGet('http://api.example.com/v1/metrics/pull-request').reply(500);

    const options = {
      config: new ConfigReader({
        apis: {
          metrics: 'http://api.example.com',
        },
      }),
      logger: getVoidLogger(),
      catalogApi: new CatalogClient({ discoveryApi: { getBaseUrl: () => Promise.resolve('http://example.com') } }),
    };

    const params = {
      service_name: 'test-service',
      owner_name: 'test-owner',
      start_date: new Date('2022-01-01').toISOString(),
      end_date: new Date('2022-01-31').toISOString(),
    };

    await expect(fetchPullRequest(options, params)).rejects.toThrow('Request failed with status code 500');
  });
});
