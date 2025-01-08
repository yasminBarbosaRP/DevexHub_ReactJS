import React, { useCallback, useMemo } from 'react';
import {
  Box,
  IconButton,
  Tooltip,
  Typography,
  makeStyles,
} from '@material-ui/core';
import DownloadIcon from '@material-ui/icons/GetApp';

import {
  MetricsResponse,
  MetricsResponseBehaviorsWithoutEmpty,
} from '@internal/plugin-picpay-metrics-backend';
import { MetricInfo } from '../MetricInfo';

import { MetricTooltip } from '../MetricTooltip';
import { FulfilledMetricChart } from './FulfilledMetricChart';
import { LoadingMetricChart } from './LoadingMetricChart';
import { FailedMetricChart } from './FailedMetricChart';
import { EmptyMetricChart } from './EmptyMetricChart';
import { exportToCsv } from '@internal/plugin-picpay-commons';

const useStyles = makeStyles(theme => ({
  metricContainer: {
    backgroundColor: theme.palette.background.paper,
    display: 'flex',
    width: '100%',
    borderRadius: '4px',
  },

  chartContainer: {
    height: '350px',
    width: 'calc(100% - 260px)',
    padding: '12px',
    borderRight: `1px solid ${theme.palette.divider}`,
  },

  chartHeader: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
  },

  chartTitle: {
    margin: 'auto',
    display: 'flex',
    gap: '8px',
    alignItems: 'center',
  },
}));

type MetricChartProps = {
  metric?: MetricsResponse[keyof MetricsResponse];
  isLoading: boolean;
};

export const MetricChart = ({ metric, isLoading }: MetricChartProps) => {
  const classes = useStyles();

  const metricCsv = useMemo(() => metric?.data?.csvData ?? [], [metric]);

  const metricInfo = useMemo((): {
    title: string;
    type?: MetricsResponseBehaviorsWithoutEmpty;
    noResult: string;
  } => {
    switch (metric?.behavior) {
      case 'LEAD_TIME':
      case 'EMPTY_LEAD_TIME':
        return {
          title: 'Lead Time for Changes',
          type: 'LEAD_TIME',
          noResult: "Lead Time can't be measured",
        };
      case 'CFR':
      case 'EMPTY_CFR':
        return {
          title: 'Deployment Failure Rate',
          type: 'CFR',
          noResult: "Deployment Failure Rate can't be measured",
        };
      case 'DEPLOYMENT_FREQUENCY':
        return {
          title: 'Deployment Frequency',
          type: 'DEPLOYMENT_FREQUENCY',
          noResult: '',
        };
      default:
        return {
          title: '',
          noResult: '',
        };
    }
  }, [metric?.behavior]);

  const getCurrentChart = useCallback(() => {
    if (isLoading) {
      return <LoadingMetricChart />;
    }

    if (!metric) {
      return <FailedMetricChart />;
    }

    if (
      metric.behavior === 'EMPTY_LEAD_TIME' ||
      metric.behavior === 'EMPTY_CFR'
    ) {
      return <EmptyMetricChart noResultText={metricInfo.noResult} />;
    }

    return <FulfilledMetricChart metric={metric} />;
  }, [metric, isLoading, metricInfo.noResult]);

  return (
    <Box className={classes.metricContainer}>
      <Box className={classes.chartContainer}>
        <Box className={classes.chartHeader}>
          {Boolean(metricCsv?.length) && (
            <Tooltip title="Download as CSV" placement="right">
              <IconButton
                onClick={() =>
                  exportToCsv(`${metricInfo.type?.toLowerCase()}`, metricCsv)
                }
                style={{ padding: 0 }}
              >
                <DownloadIcon />
              </IconButton>
            </Tooltip>
          )}

          <Box className={classes.chartTitle}>
            <Typography component="div">
              <Box textAlign="center" fontWeight="fontWeightBold" fontSize={20}>
                {metricInfo.title}
              </Box>
            </Typography>

            {metricInfo.type && (
              <MetricTooltip
                metricType={metricInfo.type}
                tooltipSource="METRIC_TITLE"
              />
            )}
          </Box>
        </Box>
        {getCurrentChart()}
      </Box>
      <MetricInfo metric={metric} />
    </Box>
  );
};
