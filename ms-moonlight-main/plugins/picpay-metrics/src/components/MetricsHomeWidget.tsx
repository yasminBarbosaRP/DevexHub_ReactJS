import { Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';
import MetricFilters from './MetricFilters';
import {
  ExhibitionPeriod,
  MetricsResponse,
} from '@internal/plugin-picpay-metrics-backend';
import { MetricChart } from './metricChart/MetricChartContainer';
import { AsyncState } from 'react-use/lib/useAsyncFn';

const useStyles = makeStyles(theme => ({
  widgetContainer: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '4px',
  },
  widgetTitle: {
    padding: '16px',
  },
  metricContainer: {
    borderTop: `1px solid ${theme.palette.divider}`,
    display: 'flex',
    gap: '32px',
  },
  filtersContainer: {
    marginTop: '12px',
    paddingLeft: '16px',
    paddingBottom: '16px',
    minWidth: '230px',
  },
  chartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: 'calc(100% - 230px)',
  },
}));

type MetricsHomeWidgetProps = {
  bffResponse: AsyncState<MetricsResponse>;
  startDate: Date;
  endDate: Date;
  groupedBy: ExhibitionPeriod;
  squads: string[];
  selectedSquad: string;
  selectedMetric: keyof MetricsResponse;
  setStartDate: (date: Date) => void;
  setEndDate: (date: Date) => void;
  setGroupedBy: (period: ExhibitionPeriod) => void;
  setSelectedSquad: (squad: string) => void;
  setSelectedMetric: (metric: keyof MetricsResponse) => void;
};

export const MetricsHomeWidget = ({
  bffResponse,
  startDate,
  endDate,
  groupedBy,
  squads,
  selectedSquad,
  selectedMetric,
  setEndDate,
  setGroupedBy,
  setStartDate,
  setSelectedSquad,
  setSelectedMetric,
}: MetricsHomeWidgetProps) => {
  const classes = useStyles();

  if (!squads.length) {
    return null;
  }

  return (
    <Box className={classes.widgetContainer}>
      <Typography className={classes.widgetTitle} variant="h5">
          DORA Metrics
      </Typography>
      <Box className={classes.metricContainer}>
        <Box className={classes.filtersContainer}>
          <MetricFilters
            source="HOME_PAGE"
            startDate={startDate}
            endDate={endDate}
            groupedBy={groupedBy}
            onDateRangeSelect={(start: Date, end: Date) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onGroupedBySelect={(period: ExhibitionPeriod) =>
              setGroupedBy(period)
            }
            squads={squads}
            selectedSquad={selectedSquad}
            onSquadSelect={setSelectedSquad}
            selectedMetric={selectedMetric}
            onMetricSelect={setSelectedMetric}
          />
        </Box>
        <Box className={classes.chartsContainer}>
          <MetricChart
            metric={bffResponse?.value?.[selectedMetric]}
            isLoading={bffResponse.loading}
          />
        </Box>
      </Box>
    </Box>
  );
};
