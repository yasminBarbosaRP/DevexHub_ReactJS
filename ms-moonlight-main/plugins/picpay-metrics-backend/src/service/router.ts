import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express, { Request } from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { resolveMetricsResponse, resolvePullRequestResponse } from './service';
import { MetricApiParams, PullRequestApiData, PullRequestApiParams, fetchMetrics, fetchPullRequest } from '../repository/repository';
import { ExhibitionPeriod } from '../types/domain';
import { CatalogApi } from '@backstage/catalog-client';

export interface RouterOptions {
  config: Config;
  logger: Logger;
  catalogApi: CatalogApi;
}

export type MetricsParams = {
  startDate: string;
  endDate: string;
  exhibition: ExhibitionPeriod;
};

export type PullRequestParams = {
  startDate: string;
  endDate: string;
  serviceName: string;
  ownerName: string;
};

export async function createRouter(
  options: RouterOptions
): Promise<express.Router> {
  const { logger, catalogApi } = options;

  const router = Router();
  router.use(express.json());

  router.get(
    '/service/:serviceName',
    async (
      request: Request<{ serviceName: string }, {}, {}, MetricsParams>,
      response
    ) => {
      try {
        const queryParams = request.query;

        const apiParams: MetricApiParams = {
          start_date: new Date(queryParams.startDate)
            .toISOString()
            .substring(0, 10),
          end_date: new Date(queryParams.endDate)
            .toISOString()
            .substring(0, 10),
          exhibition: queryParams.exhibition,
          service_name: request.params.serviceName,
        };

        const metricsApiData = await fetchMetrics(options, apiParams);

        const metricsResponse = resolveMetricsResponse(
          request.params.serviceName,
          queryParams,
          metricsApiData
        );

        response.status(200).json(metricsResponse);
      } catch (err) {
        logger.error(err);
        response.status(500).json({ error: true, message: err });
      }
    }
  );

  router.get(
    '/group',
    async (
      request: Request<
        {},
        {},
        {},
        MetricsParams & { ownerNames: string[]; entityName: string }
      >,
      response
    ) => {
      try {
        const queryParams = request.query;

        const apiParams: MetricApiParams = {
          start_date: new Date(queryParams.startDate)
            .toISOString()
            .substring(0, 10),
          end_date: new Date(queryParams.endDate)
            .toISOString()
            .substring(0, 10),
          exhibition: queryParams.exhibition,
          owner_name: queryParams.ownerNames,
        };

        const metricsApiData = await fetchMetrics(options, apiParams);
        const metricsResponse = resolveMetricsResponse(
          queryParams.entityName,
          queryParams,
          metricsApiData
        );

        response.status(200).json(metricsResponse);
      } catch (err) {
        logger.error(err);
        response.status(500).json({ error: true, message: err });
      }
    }
  );

  router.get(
    '/pull-request',
    async (
      request: Request<{}, {}, {}, PullRequestParams>,
      response
    ) => {
      try {
        const queryParams = request.query;
        const { startDate, endDate, serviceName, ownerName } = queryParams;
  
        if (!startDate || !endDate) {
          return response.status(400).json({
            error: true,
            message: 'The startDate and endDate parameters are required.',
          });
        }
  
        if (!serviceName && !ownerName) {
          return response.status(400).json({
            error: true,
            message: 'At least one of the parameters serviceName or ownerName must be provided.',
          });
        }
  
        const apiParams: PullRequestApiParams = {
          start_date: new Date(startDate).toISOString().substring(0, 10),
          end_date: new Date(endDate).toISOString().substring(0, 10),
          service_name: serviceName,
          owner_name: ownerName
        };
  
        const pullRequestApiData: PullRequestApiData = await fetchPullRequest(options, apiParams);
  
        if (!pullRequestApiData.pull_requests) {
          return response.status(200).json({
            openPullRequests: 0,
            closedPullRequests: 0,
            mergedPullRequests: 0,
            otherTeamsOpenPullRequests: 0,
            averageFilesChanged: 0,
            averageOpenTime: 0,
            averageTimeToStartReview: 0,
            averageTimeToRequiredReview: 0,
            pullRequests: []
          });
        }
  
        const pullRequestResponse = await resolvePullRequestResponse(pullRequestApiData, catalogApi, logger);
    
        return response.status(200).json(pullRequestResponse);
      } catch (err) {
        logger.error(err);
        return response.status(500).json({ error: true, message: err });
      }
    }
  );
  
  router.use(errorHandler());
  return router;
}
