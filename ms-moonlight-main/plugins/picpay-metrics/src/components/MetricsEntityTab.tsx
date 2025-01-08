import { Box, makeStyles } from '@material-ui/core';
import React from 'react';
import MetricFilters from './MetricFilters';
import {
  ExhibitionPeriod,
  MetricsResponse,
} from '@internal/plugin-picpay-metrics-backend';
import { MetricChart } from './metricChart/MetricChartContainer';
import { AsyncState } from 'react-use/lib/useAsyncFn';
import { MetricsSource } from './Metrics';

const useStyles = makeStyles(() => ({
  metricContainer: {
    display: 'flex',
    gap: '32px',
    marginRight: '64px',
  },
  filtersContainer: {
    minWidth: '230px',
  },
  chartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: 'calc(100% - 230px)',
  },
}));

type MetricsEntityTabProps = {
  bffResponse: AsyncState<MetricsResponse>;
  startDate: Date;
  endDate: Date;
  groupedBy: ExhibitionPeriod;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setGroupedBy: (period: ExhibitionPeriod) => void;
  source: Exclude<MetricsSource, 'HOME_PAGE'>;
};

export const MetricsEntityTab = ({
  bffResponse,
  startDate,
  endDate,
  groupedBy,
  setEndDate,
  setGroupedBy,
  setStartDate,
  source,
}: MetricsEntityTabProps) => {
  const classes = useStyles();

  return (
    <Box className={classes.metricContainer}>
      <Box className={classes.filtersContainer}>
        <MetricFilters
          startDate={startDate}
          endDate={endDate}
          groupedBy={groupedBy}
          onDateRangeSelect={(start: Date, end: Date) => {
            setStartDate(start);
            setEndDate(end);
          }}
          onGroupedBySelect={(period: ExhibitionPeriod) => setGroupedBy(period)}
          source={source}
        />
      </Box>
      <Box className={classes.chartsContainer}>
        <MetricChart
          metric={bffResponse?.value?.deploymentFrequency}
          isLoading={bffResponse.loading}
        />
        <MetricChart
          metric={bffResponse?.value?.leadTime}
          isLoading={bffResponse.loading}
        />
        <MetricChart
          metric={bffResponse?.value?.changeFailureRate}
          isLoading={bffResponse.loading}
        />
      </Box>
    </Box>
  );
};
