export type DeployFrequencyApiResponse = {
  deployments: number;
  performance: ApiMetricPerformance;
  frequency_average: number;
  frequency_days: {
    [key: string]: {
      count: number;
      details: MetricDetails;
    };
  };
};

export type LeadTimeApiResponse = {
  performance: ApiMetricPerformance;
  average: number;
  deployments: {
    [key: string]: {
      lead_time: number;
      details: MetricDetails;
    };
  };
};

export type CfrApiResponse = {
  performance: ApiMetricPerformance;
  average: number;
  failures: {
    [key: string]: {
      count: number;
      details: MetricDetails;
    };
  };
};

export type MetricDetails = {
  [key: string]: {
    id: string;
    service: {
      name: string;
    };
    source: string;
    status: string;
    started_at: string;
    ended_at: string;
    build: {
      id: string;
    };
    lead_time?: number;
    commits?: Array<{
      commit_id: string;
      date: string;
      merged_at: string;
      author: string;
    }>;
  };
};

export type ApiMetricPerformance = 'elite' | 'high' | 'medium' | 'low';
