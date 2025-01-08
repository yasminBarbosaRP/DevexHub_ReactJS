import React, { useEffect, useMemo, useState } from 'react';
import MomentUtils from '@date-io/moment';
import {
  Box,
  FormControl,
  FormHelperText,
  MenuItem,
  Select,
  makeStyles,
} from '@material-ui/core';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import moment from 'moment';
import {
  ExhibitionPeriod,
  MetricsResponse,
} from '@internal/plugin-picpay-metrics-backend';
import { DateRangePicker } from '@internal/plugin-picpay-commons';
import { MetricsSource } from './Metrics';

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  formItem: {
    minWidth: '100%',
  },
}));

type MetricsFilterProps =
  | MetricsFilterServiceProps
  | MetricsFilterGroupProps
  | MetricsFilterHomePageProps;

type MetricsFilterBaseProps<T extends MetricsSource> = {
  startDate?: Date;
  endDate?: Date;
  groupedBy: ExhibitionPeriod;
  onDateRangeSelect: (start: Date, end: Date) => void;
  onGroupedBySelect: (exhibitionPeriod: ExhibitionPeriod) => void;
  source: T;
};

type MetricsFilterServiceProps = MetricsFilterBaseProps<'SERVICE'>;

type MetricsFilterGroupProps = MetricsFilterBaseProps<'GROUP'>;

type MetricsFilterHomePageProps = MetricsFilterBaseProps<'HOME_PAGE'> & {
  squads: string[];
  selectedSquad: string;
  selectedMetric: keyof MetricsResponse;
  onSquadSelect: (squad: string) => void;
  onMetricSelect: (metric: keyof MetricsResponse) => void;
};

const MetricFilters = (props: MetricsFilterProps) => {
  const classes = useStyles();

  const {
    groupedBy,
    onDateRangeSelect,
    onGroupedBySelect,
    source,
    endDate,
    startDate,
  } = props;

  const [selectedStartDate, setSelectedStartDate] = useState(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState<typeof endDate | null>(
    endDate
  );

  useEffect(() => {
    setSelectedStartDate(startDate);
    setSelectedEndDate(endDate);
  }, [startDate, endDate]);

  const minDate = useMemo(() => {
    if (!selectedEndDate) {
      return selectedStartDate;
    }

    return moment().subtract(2, 'years').toDate();
  }, [selectedStartDate, selectedEndDate]);

  const maxDate = useMemo(() => {
    const currentDate = new Date();

    if (selectedStartDate?.toString() === startDate?.toString()) {
      return currentDate;
    }

    const EXHIBITION_PERIOD_MAX_DATE_MAP: { [key in ExhibitionPeriod]: Date } =
      {
        DAY: moment(selectedStartDate).add(1, 'month').toDate(),
        WEEK: moment(selectedStartDate).add(6, 'months').toDate(),
        MONTH: moment(selectedStartDate).add(6, 'months').toDate(),
      };

    const maxDateByGroup = EXHIBITION_PERIOD_MAX_DATE_MAP[groupedBy];

    return maxDateByGroup > currentDate ? currentDate : maxDateByGroup;
  }, [startDate, selectedStartDate, groupedBy]);

  return (
    <MuiPickersUtilsProvider libInstance={moment} utils={MomentUtils}>
      <Box className={classes.container}>
        {source === 'HOME_PAGE' && [
          <FormControl className={classes.formItem}>
            <FormHelperText>Metric:</FormHelperText>
            <Select
              value={props.selectedMetric}
              onChange={e =>
                props.onMetricSelect(e.target.value as keyof MetricsResponse)
              }
            >
              <MenuItem value="deploymentFrequency">
                Deployment Frequency
              </MenuItem>
              <MenuItem value="leadTime">Lead Time</MenuItem>
              <MenuItem value="changeFailureRate">
                Deployment Failure Rate
              </MenuItem>
            </Select>
          </FormControl>,
          <FormControl className={classes.formItem}>
            <FormHelperText>Squad:</FormHelperText>
            <Select
              value={props.selectedSquad}
              onChange={e => props.onSquadSelect(e.target.value as string)}
            >
              {props.squads.map(squad => (
                <MenuItem key={squad} value={squad}>
                  {squad}
                </MenuItem>
              ))}
            </Select>
          </FormControl>,
        ]}
        <FormControl data-testid="group-by" className={classes.formItem}>
          <FormHelperText>Group By:</FormHelperText>
          <Select
            value={groupedBy}
            onChange={e =>
              onGroupedBySelect(e.target.value as ExhibitionPeriod)
            }
          >
            <MenuItem value="DAY">Day</MenuItem>
            <MenuItem value="WEEK">Week</MenuItem>
            <MenuItem value="MONTH">Month</MenuItem>
          </Select>
        </FormControl>
        <FormControl className={classes.formItem}>
          <FormHelperText>Date Range:</FormHelperText>
          <DateRangePicker
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            onStartDateSelect={date =>
              date
                ? setSelectedStartDate(date)
                : setSelectedStartDate(startDate)
            }
            onEndDateSelect={date => {
              setSelectedEndDate(date);

              if (date && selectedStartDate) {
                onDateRangeSelect(selectedStartDate, date);
              }
            }}
            onReset={() => {
              setSelectedStartDate(startDate);
              setSelectedEndDate(endDate);
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
        </FormControl>
      </Box>
    </MuiPickersUtilsProvider>
  );
};

export default MetricFilters;
