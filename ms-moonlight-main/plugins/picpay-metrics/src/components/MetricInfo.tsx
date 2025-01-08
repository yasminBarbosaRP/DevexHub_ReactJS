import React, { useMemo } from 'react';
import { Box, Typography, makeStyles } from '@material-ui/core';
import {
  MetricsResponse,
  MetricsResponseBehaviorsWithoutEmpty,
} from '@internal/plugin-picpay-metrics-backend';
import { MetricTooltip } from './MetricTooltip';

const useStyles = makeStyles(theme => ({
  metricInfoContainer: {
    height: '350px',
    width: '260px',
    display: 'flex',
    flexDirection: 'column',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '4px',
    justifyContent: 'space-between',
  },

  metricInfoPerformance: {
    flexDirection: 'column',
    display: 'flex',
    minHeight: '50%',
    justifyContent: 'center',
  },

  metricInfoPerformanceTitle: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '8px',
  },

  metricInfoCalculation: {
    flexDirection: 'column',
    display: 'flex',
    minHeight: '50%',
    justifyContent: 'center',
    borderTop: `1px solid ${theme.palette.divider}`,
  },
}));

export const MetricInfo = ({
  metric,
}: {
  metric?: MetricsResponse[keyof MetricsResponse];
}) => {
  const classes = useStyles();

  const metricColor = useMemo(() => {
    switch (metric?.data?.performace) {
      case 'ELITE':
        return '#4CAF50';
      case 'HIGH':
        return '#2196F3';
      case 'MEDIUM':
        return '#FFC107';
      case 'LOW':
        return '#FF5252';
      case 'N/A':
      default:
        return '#9E9E9E';
    }
  }, [metric]);

  const metricCalculation = useMemo((): {
    name: string;
    value: string | number;
    type: MetricsResponseBehaviorsWithoutEmpty;
  } => {
    switch (metric?.behavior) {
      case 'EMPTY_LEAD_TIME':
      case 'LEAD_TIME':
        return {
          name: 'Median',
          value: metric.data.median,
          type: 'LEAD_TIME',
        };

      case 'EMPTY_CFR':
      case 'CFR':
        return {
          name: 'Rate',
          value: metric.data.rate,
          type: 'CFR',
        };

      case 'DEPLOYMENT_FREQUENCY':
        return {
          name: 'Average',
          value: metric.data.average,
          type: 'DEPLOYMENT_FREQUENCY',
        };
      default:
        return {
          name: 'Average',
          value: '-',
          type: 'DEPLOYMENT_FREQUENCY',
        };
    }
  }, [metric]);

  return (
    <Box className={classes.metricInfoContainer}>
      <Box className={classes.metricInfoPerformance}>
        <Box className={classes.metricInfoPerformanceTitle}>
          <Typography component="div">
            <Box textAlign="center" fontWeight="fontWeightBold" fontSize={20}>
              Performance
            </Box>
          </Typography>

          <MetricTooltip
            metricType={metricCalculation.type}
            tooltipSource="METRIC_PERFORMANCE"
          />
        </Box>
        <Box>
          <Typography component="div">
            <Box
              textAlign="center"
              fontWeight="fontWeightBold"
              fontSize={40}
              color={metricColor}
            >
              {metric?.data?.performace ?? '-'}
            </Box>
          </Typography>
        </Box>
      </Box>
      <Box className={classes.metricInfoCalculation}>
        <Box>
          <Typography component="div">
            <Box textAlign="center" fontWeight="fontWeightBold" fontSize={20}>
              {metricCalculation.name}
            </Box>
          </Typography>
        </Box>
        <Box>
          <Typography component="div">
            <Box
              textAlign="center"
              fontWeight="fontWeightBold"
              fontSize={40}
              color={metricColor}
            >
              {metricCalculation.value}
            </Box>
          </Typography>
        </Box>
      </Box>
    </Box>
  );
};
