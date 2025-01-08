export type VisionAPISourcesResponse = Source[];

export type VisionAPIEvaluationResponse = {
  id: number;
  project: Project;
  metrics: Metric[];
  scores: Score[];
  score: number;
  pass: boolean;
  createdAt: string;
};

export type Metric = {
  id: number;
  source: Source;
  name: string;
  description: string;
  linkDoc: string;
  requirement: 'optional' | 'required';
  details?: string;
  pass: boolean;
  data?: MetricData | null;
};

export type MetricData = {
  value: any;
  valueUnit: string;
}

export type Score = {
  id: number;
  source: Source;
  score: number;
  pass: boolean;
};

export type Project = {
  id: number;
  name: string;
  description: string;
  bu: string;
  status: 'not_evaluated' | 'waiting_for_update' | 'updating' | 'updated';
  squad: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Source = {
  id: string;
  name: string;
  description: string;
  bu: string;
  squad: string;
  linkDoc: string;
  active: boolean;
  url: string;
  createdAt: string;
  updatedAt: string;
};
