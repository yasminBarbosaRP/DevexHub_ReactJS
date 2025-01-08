import React, { useEffect, useMemo, useState } from 'react';
import MomentUtils from '@date-io/moment';
import {
  Box,
  FormControl,
  FormHelperText,
  Theme,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { MuiPickersUtilsProvider } from '@material-ui/pickers';
import moment from 'moment';
import { DateRangePicker } from '@internal/plugin-picpay-commons';

const useStyles = makeStyles((theme: Theme) => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },

  formItem: {
    minWidth: '100%',
  },

  formInfo: {
    color: theme.palette.textSubtle,
    fontSize: '0.75rem',
  }
}));

type MetricsFilterProps = {
  startDate?: Date;
  endDate?: Date;
  onDateRangeSelect: (start: Date, end: Date) => void;
};

const TasksFilters = (props: MetricsFilterProps) => {
  const classes = useStyles();

  const {
    onDateRangeSelect,
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

    const maxDateByGroup = moment(selectedStartDate).add(6, 'months').toDate();

    return maxDateByGroup > currentDate ? currentDate : maxDateByGroup;
  }, [startDate, selectedStartDate]);

  return (
    <MuiPickersUtilsProvider libInstance={moment} utils={MomentUtils}>
      <Box className={classes.container}>
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
          <Typography className={classes.formInfo}>
            <i>max of 6 months</i>
          </Typography>
        </FormControl>
      </Box>
    </MuiPickersUtilsProvider>
  );
};

export default TasksFilters;
