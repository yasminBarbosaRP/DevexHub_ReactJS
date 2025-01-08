import {
  Score,
  VisionAPIEvaluationResponse,
  VisionAPISourcesResponse,
  MetricData,
} from '../types/api';
import {
  VisionCatalogContent,
  VisionChecks,
  VisionOverview,
  VisionToolCheck,
  VisionToolCheckMetric,
} from '../types/domain';

const buildVisionOverview = (
  evaluation: VisionAPIEvaluationResponse
): VisionOverview => {
  if (evaluation.scores.length > 1) {
    const sortedScores = evaluation.scores
      .filter(v => v.source.active)
      .sort((a, b) => a.score - b.score);

    return {
      behavior: 'DETAILED',
      data: {
        visionScore: Math.round(evaluation.score),
        bestToolScore: {
          name: sortedScores[sortedScores.length - 1].source.name,
          score: Math.round(sortedScores[sortedScores.length - 1].score),
        },
        worstToolScore: {
          name: sortedScores[0].source.name,
          score: Math.round(sortedScores[0].score),
        },
      },
    };
  }

  return {
    behavior: 'SIMPLIFIED',
    data: {
      visionScore: Math.round(evaluation.score),
    },
  };
};

const buildVisionChecks = (
  evaluation: VisionAPIEvaluationResponse,
  sources: VisionAPISourcesResponse
): VisionChecks => {
  const activeSources = sources.filter(v => v.active);

  const mappedScoresBySourceName = evaluation.scores.reduce<{
    [key: string]: Score;
  }>((acc, score) => ({ ...acc, [score.source.name]: score }), {});

  const visionToolChecksWithoutMetrics = activeSources.map<VisionToolCheck>(
    source => {
      const score = mappedScoresBySourceName[source.name];

      if (!score) {
        return {
          behavior: 'DISABLED',
          data: {
            toolId: source.id,
            toolName: source.name,
            docsUrl: source.linkDoc,
          },
        };
      }

      return {
        behavior: score.pass ? 'PASS' : 'FAILED',
        data: {
          toolId: source.id,
          toolName: score.source.name,
          docsUrl: score.source.linkDoc,
          metrics: [],
          toolScore: Math.round(score.score),
        },
      };
    }
  );

  const mappedMetricsByName = evaluation.metrics.reduce<{
    [key: string]: VisionToolCheckMetric[];
  }>((acc, v) => {
    const mappedMetricsValueByUnit = (
      metric: MetricData | undefined | null,
    ): string => {
      if (!metric || metric === undefined) {
        return '';
      }
      switch (metric.valueUnit) {
        case 'string':
          return metric.value;
        case 'number':
          return parseFloat(metric.value).toFixed(2);
        case 'boolean':
          return metric.value ? 'Yes' : 'No';
        case 'percentage':
          return `${parseFloat(metric.value).toFixed(0)}%`;
        case 'day':
          return `${metric.value.toFixed(2)} days`;
        case 'date':
          return metric.value;
        case 'number_by_day':
          return `${metric.value.toFixed(4)}/day`;
        default:
          return `${metric.value} ${metric.valueUnit}`;
      }
    };

    const metric: VisionToolCheckMetric = {
      metricName: v.name,
      metricDetails: v.description,
      metricDocUrl: v.linkDoc,
      metricValue: v.data ? mappedMetricsValueByUnit(v.data) : undefined,
      required: v.requirement === 'required',
      status: v.pass ? 'PASS' : 'FAILED',
    };

    if (acc[v.source.name]) {
      return {
        ...acc,
        [v.source.name]: [...acc[v.source.name], metric],
      };
    }

    return {
      ...acc,
      [v.source.name]: [metric],
    };
  }, {});

  return {
    behavior:
      evaluation.project.status === 'updating' ||
      evaluation.project.status === 'waiting_for_update'
        ? 'REFRESHING'
        : 'IDLE',

    data: visionToolChecksWithoutMetrics.map(v => {
      if (v.behavior === 'DISABLED') {
        return v;
      }

      return {
        ...v,
        data: { ...v.data, metrics: mappedMetricsByName[v.data.toolName] },
      };
    }),
  };
};

export const createVisionCatalogContentResponse = (
  evaluationsData: VisionAPIEvaluationResponse,
  sourcesData: VisionAPISourcesResponse
) => {
  const visionCatalogContent: VisionCatalogContent = {
    visionOverview: buildVisionOverview(evaluationsData),
    visionChecks: buildVisionChecks(evaluationsData, sourcesData),
  };

  return visionCatalogContent;
};
