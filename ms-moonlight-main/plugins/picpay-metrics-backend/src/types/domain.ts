export type MetricsResponse = {
  leadTime: LeadTimeResponse;
  changeFailureRate: ChangeFailureRateResponse;
  deploymentFrequency: DeploymentFrequencyResponse;
};

type userDetails = {
  entityRef: string;
  name: string;
  picture: string;
}

export type PullRequestResponse = {
  openPullRequests: number;
  closedPullRequests: number;
  mergedPullRequests: number;
  otherTeamsOpenPullRequests: number;
  averageFilesChanged: number;
  averageOpenTime: number;
  averageTimeToStartReview: number;
  averageTimeToRequiredReview: number;
  pullRequests: PullRequestDetails[];
}

export type PullRequestDetails = {
  title: string;
  service: string;
  creator: userDetails;
  state: string;
  linkPr: string;
  owner: string;
  filesChanged: number;
  linesAdded: number;
  linesRemoved: number;
  createdAt: string;
  createdRelativeTime: string;
  mergedAt: string | null; 
  mergedRelativeTime: string | null;
  language: string | null;
  coverage: number | null;
  approvers: userDetails[];
  creatorBelongsToTeamOwner: boolean;
};

export type LeadTimeResponse = {
  data: BaseMetricDataResponse & { median: string };
  behavior: 'LEAD_TIME' | 'EMPTY_LEAD_TIME';
};

export type ChangeFailureRateResponse = {
  data: BaseMetricDataResponse & { rate: string };
  behavior: 'CFR' | 'EMPTY_CFR';
};

export type DeploymentFrequencyResponse = {
  data: BaseMetricDataResponse & { average: number };
  behavior: 'DEPLOYMENT_FREQUENCY';
};

export type BaseMetricDataResponse = {
  performace: MetricPerformance;
  chart: MetricChart;
  bottomAxisTicks: string[];
  leftAxisTicks: number[];
  csvData: Array<{
    [key: string]: string | number;
  }>;
};

export type MetricChart = {
  id: string;
  data: Array<{
    x: string;
    y: number;
    details: MetricChartDetails;
  }>;
};

export type MetricChartDetails = {
  tooltip: {
    text: string;
  };
  modal: MetricChartDetailsModal;
};

export type MetricChartDetailsModal = {
  repositories: MetricChartDetailsRepository[];
};

export type MetricChartDetailsRepository = {
  name: string;
  url: string;
  deploys: MetricChartDetailsDeploy[];
};

export type MetricChartDetailsDeploy = {
  version: string;
  url: string;
  source: string;
  commits: MetricChartDetailsCommit[];
};

export type MetricChartDetailsCommit = {
  hash: string;
  url: string;
  date: string;
  mergeDate: string;
  authorName: string;
  authorUrl: string;
};

export type MetricPerformance = 'ELITE' | 'HIGH' | 'MEDIUM' | 'LOW' | 'N/A';

export type ExhibitionPeriod = 'DAY' | 'WEEK' | 'MONTH';

export type MetricsResponseBehaviors =
  MetricsResponse[keyof MetricsResponse]['behavior'];

export type MetricsResponseBehaviorsWithoutEmpty = Exclude<
  MetricsResponseBehaviors,
  'EMPTY_LEAD_TIME' | 'EMPTY_CFR'
>;
