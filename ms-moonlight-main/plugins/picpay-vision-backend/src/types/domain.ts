export type VisionCatalogContent = {
  visionOverview: VisionOverview;
  visionChecks: VisionChecks;
};

export type VisionOverview = VisionOverviewSimplified | VisionOverviewDetailed;

export type VisionChecks = {
  behavior: 'IDLE' | 'REFRESHING';
  data: VisionToolCheck[];
};

export type VisionOverviewSimplified = {
  behavior: 'SIMPLIFIED';
  data: {
    visionScore: number;
  };
};

export type VisionOverviewDetailed = {
  behavior: 'DETAILED';
  data: {
    visionScore: number;
    bestToolScore: {
      name: string;
      score: number;
    };
    worstToolScore: {
      name: string;
      score: number;
    };
  };
};

export type VisionToolCheck =
  | VisionToolCheckPass
  | VisionToolCheckFailed
  | VisionToolCheckDisabled;

export type VisionToolStatus = 'PASS' | 'FAILED' | 'DISABLED';

export type VisionToolCheckPass = {
  behavior: Extract<VisionToolStatus, 'PASS'>;
  data: {
    toolId: string;
    toolName: string;
    toolScore: number;
    docsUrl: string;
    metrics: VisionToolCheckMetric[];
  };
};

export type VisionToolCheckFailed = {
  behavior: Extract<VisionToolStatus, 'FAILED'>;
  data: {
    toolId: string;
    toolName: string;
    toolScore: number;
    docsUrl: string;
    metrics: VisionToolCheckMetric[];
  };
};

export type VisionToolCheckDisabled = {
  behavior: Extract<VisionToolStatus, 'DISABLED'>;
  data: {
    toolId: string;
    toolName: string;
    docsUrl: string;
  };
};

export type VisionToolCheckMetric = {
  metricName: string;
  metricDocUrl: string;
  metricDetails?: string;
  metricValue?: string;
  required: boolean;
  status: Extract<VisionToolStatus, 'PASS' | 'FAILED'>;
};

export type ScoreTestCertified = {
  score: number;
};

export interface ScoreTestMetricsDetails {
  projects: ScoreTestProject[]
  page: number
  limit: number
  nextPage: number
}

export interface  ScoreTestProject {
  name: string
  bu: string
  squad: string
  metrics: ScoreTestMetric[]
}

export interface ScoreTestMetric {
  name: string
  pass: boolean
  data?: ScoreTestMetricData
}

export interface ScoreTestMetricData {
  // TODO: na duvida se são esses os tipos válidos
  value?: number | string
}
