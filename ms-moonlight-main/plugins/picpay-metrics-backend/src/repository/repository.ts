import { RouterOptions } from '../service/router';
import axios from 'axios';
import { ExhibitionPeriod } from '../types/domain';
import {
  CfrApiResponse,
  DeployFrequencyApiResponse,
  LeadTimeApiResponse,
} from '../types/api';
import qs from 'qs';

export type MetricApiParams = {
  start_date: string;
  end_date: string;
  exhibition: ExhibitionPeriod;
  service_name?: string;
  owner_name?: string[];
};

export type MetricsApiData = {
  leadTimeData: LeadTimeApiResponse;
  deployFrequencyData: DeployFrequencyApiResponse;
  cfrData: CfrApiResponse;
};

export type PullRequestApiParams = {
  start_date: string;
  end_date: string;
  service_name?: string;
  owner_name?: string;
};

export type PullRequestApiData = {
  open_pull_requests: number,
  closed_pull_requests: number,
  merged_pull_requests: number,
  other_teams_open_pull_requests: number,
  average_files_changed: number,
  average_open_time: number,
  average_time_to_start_review: number,
  average_time_to_required_review: number,
  pull_requests: PullRequestsListApiData[];
}

export type PullRequestsListApiData = {
  id: string;
  service: ServicePullRequestApiData;
  number: number;
  author_login: string;
  author_email: string;
  branch_name: string;
  commits: any[]; 
  requested_teams: any[]; 
  commits_after_pull_request_creation: number;
  time_between_first_commit_and_pr: number;
  time_to_start_review: number;
  open_time: number;
  size: SizePullRequestApiData;
  labels: any[];
  state: string;
  created_at: string; 
  merged_at: string | null; 
  title: string;
  language: string | null;
  reviews: Record<string, ReviewPullRequestApiData[]>;
  coverage: any;
  owner_name: string;
  author_belongs_to_team_owner: boolean;
};

export type ServicePullRequestApiData = {
  id: string;
  name: string;
}

export type SizePullRequestApiData = {
  files: number;
  additions: number;
  deletions: number;
}

export type ReviewPullRequestApiData = {
  state: string;
  submitted_at: string;
}

const fetchLeadTime = async (baseUrl: string, params: MetricApiParams) => {
  const leadTimeRequestUrl = `${baseUrl}/lead-time`;

  const { data } = await axios.get<LeadTimeApiResponse>(leadTimeRequestUrl, {
    params: {
      ignore_first_deploy: true,
      median: true,
      detailed: true,
      ...params,
    },
    paramsSerializer: p => qs.stringify(p, { arrayFormat: 'repeat' }),
  });

  return data;
};

const fetchDeployFrequency = async (
  baseUrl: string,
  params: MetricApiParams
) => {
  const deployFrequencyRequestUrl = `${baseUrl}/deploy-frequency`;

  const { data } = await axios.get<DeployFrequencyApiResponse>(
    deployFrequencyRequestUrl,
    {
      params: { detailed: true, ...params },
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'repeat' }),
    }
  );

  return data;
};

const fetchCfr = async (baseUrl: string, params: MetricApiParams) => {
  const cfrRequestUrl = `${baseUrl}/cfr`;

  const { data } = await axios.get<CfrApiResponse>(cfrRequestUrl, {
    params: { detailed: true, ...params },
    paramsSerializer: p => qs.stringify(p, { arrayFormat: 'repeat' }),
  });

  return data;
};

export const fetchMetrics = async (
  options: RouterOptions,
  params: MetricApiParams
): Promise<MetricsApiData> => {
  const { config } = options;

  const metricsBaseUrl = `${config.getString('apis.metrics')}/v1/metrics`;

  const leadTimePromise = fetchLeadTime(metricsBaseUrl, params);
  const deployFrequencyPromise = fetchDeployFrequency(metricsBaseUrl, params);
  const cfrPromise = fetchCfr(metricsBaseUrl, params);

  const [leadTimeData, deployFrequencyData, cfrData] = await Promise.all([
    leadTimePromise,
    deployFrequencyPromise,
    cfrPromise,
  ]);

  return {
    leadTimeData,
    deployFrequencyData,
    cfrData,
  };
};

export const fetchPullRequest = async (options: RouterOptions, params: PullRequestApiParams): Promise<PullRequestApiData> => {
    const { config } = options;
    const pullRequestBaseUrl = `${config.getString('apis.metrics')}/v1/metrics/pull-request`;
  
    const { data } = await axios.get<PullRequestApiData>(pullRequestBaseUrl, {
      params: { ...params },
      paramsSerializer: p => qs.stringify(p, { arrayFormat: 'repeat' }),
    });
  
    return data;
};
