import request from 'supertest';
import express from 'express';
import { createRouter, RouterOptions } from './router';
import { fetchMetrics, fetchPullRequest } from '../repository/repository';
import { resolveMetricsResponse, resolvePullRequestResponse } from './service';
import { Config } from '@backstage/config';
import { Logger } from 'winston';
import { CatalogApi } from '@backstage/catalog-client';

jest.mock('../repository/repository');
jest.mock('./service', () => ({
  resolveMetricsResponse: jest.fn(),
  resolvePullRequestResponse: jest.fn()
}));

describe('router', () => {
  let app: express.Express;
  let options: RouterOptions;
  let mockConfig: Config;
  let mockLogger: Logger;
  let mockCatalogApi: CatalogApi;

  beforeEach(async () => {
    mockConfig = {} as Config;
    mockLogger = { error: jest.fn() } as unknown as Logger;

    options = {
      config: mockConfig,
      logger: mockLogger,
      catalogApi: mockCatalogApi
    };

    const router = await createRouter(options);
    app = express();
    app.use(router);
  });

  it('Should handle /service/:serviceName, with return 200', async () => {
    (fetchMetrics as jest.Mock).mockResolvedValue('mockedMetrics');
    (resolveMetricsResponse as jest.Mock).mockReturnValue('mockedResponse');

    const response = await request(app)
      .get('/service/testService')
      .query({
        startDate: '2022-01-01',
        endDate: '2022-01-31',
        exhibition: 'testExhibition',
      });

    expect(response.status).toBe(200);
    expect(response.body).toBe('mockedResponse');
  });
  it('Should return 500 when fail', async () => {
    (fetchMetrics as jest.Mock).mockRejectedValue('mocked error');

    const response = await request(app)
      .get('/service/testService')
      .query({
        startDate: '2022-01-01',
        endDate: '2022-01-31',
        exhibition: 'testExhibition',
      });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: true, message: 'mocked error' });
  });
  it('Should handle /group, with return 200', async () => {
    (fetchMetrics as jest.Mock).mockResolvedValue('mockedMetrics');
    (resolveMetricsResponse as jest.Mock).mockReturnValue('mockedResponse');

    const response = await request(app)
      .get('/group')
      .query({
        startDate: '2022-01-01',
        endDate: '2022-01-31',
        exhibition: 'testExhibition',
        ownerNames: ['owner1', 'owner2'],
        entityName: 'testEntity',
      });

    expect(response.status).toBe(200);
    expect(response.body).toBe('mockedResponse');
  });

  it('Should handle /pull-request, with return 200', async () => {
    const mockedPullRequestResponse = {
      averageFilesChanged: 0,
      averageOpenTime: 0,
      averageTimeToStartReview: 0,
      averageTimeToRequiredReview: 0,
      closedPullRequests: 0,
      mergedPullRequests: 0,
      openPullRequests: 0,
      otherTeamsOpenPullRequests: 0,
      pullRequests: []
    };

    (fetchPullRequest as jest.Mock).mockResolvedValue([
      { title: 'PR 1' },
      { title: 'PR 2' },
    ]);
    (resolvePullRequestResponse as jest.Mock).mockReturnValue(mockedPullRequestResponse);

    const response = await request(app)
      .get('/pull-request')
      .query({
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        serviceName: 'testService',
        ownerName: 'testOwner',
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual(mockedPullRequestResponse);
  });

  it('Should return 400 if startDate or endDate is missing', async () => {
    const response = await request(app)
      .get('/pull-request')
      .query({
        serviceName: 'testService',
        ownerName: 'testOwner',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: true,
      message: 'The startDate and endDate parameters are required.',
    });
  });

  it('Should return 400 if serviceName or ownerName are missing', async () => {
    const response = await request(app)
      .get('/pull-request')
      .query({
        startDate: '2023-01-01',
        endDate: '2023-01-31',
      });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: true,
      message: 'At least one of the parameters serviceName or ownerName must be provided.',
    });
  });

  it('Should return 500 if there is a server error', async () => {
    (fetchPullRequest as jest.Mock).mockRejectedValue(new Error('Server error'));

    const response = await request(app)
      .get('/pull-request')
      .query({
        startDate: '2023-01-01',
        endDate: '2023-01-31',
        serviceName: 'testService',
        ownerName: 'testOwner',
      });

    expect(response.status).toBe(500);
  });
});
