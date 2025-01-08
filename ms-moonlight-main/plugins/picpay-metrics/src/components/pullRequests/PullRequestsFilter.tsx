import React, { useCallback, useEffect, useMemo, useState } from 'react';
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
import { DateRangePicker, EntityPicker } from '@internal/plugin-picpay-commons';

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
  },
  errorText: {
    color: theme.palette.error.main,
    fontSize: '0.75rem',
  }
}));

type PullRequestsFilterProps = {
  startDate?: Date;
  endDate?: Date;
  onDateRangeSelect: (start: Date, end: Date) => void;
  onOwnerSelect?: (owner: string | null) => void;
  onServiceSelect?: (service: string | null) => void;
  initialOwner?: string | null;
};

const PullRequestsFilters = ({
  endDate,
  startDate,
  onDateRangeSelect,
  onOwnerSelect,
  onServiceSelect,
  initialOwner,

}: PullRequestsFilterProps) => {
  const classes = useStyles();
  const [selectedStartDate, setSelectedStartDate] = useState(startDate);
  const [selectedEndDate, setSelectedEndDate] = useState<typeof endDate | null>(endDate);
  const [selectedOwner, setSelectedOwner] = useState<string | null>(initialOwner || null);
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const [errors, setErrors] = useState({
    startDate: false,
    endDate: false,
    ownerService: false,
  });

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
    const maxDateByGroup = moment(selectedStartDate).add(6, 'months').toDate();
    return maxDateByGroup > currentDate ? currentDate : maxDateByGroup;
  }, [selectedStartDate]);

  const handleSelect = useCallback((selectedEntities: string[], setSelected: (value: string | null) => void) => {
    const selected = selectedEntities.length > 0 ? selectedEntities[0] : null;
    setSelected(selected);
  }, []);

  const validateFields = useCallback(() => {
    const newErrors = {
      startDate: !selectedStartDate,
      endDate: !selectedEndDate,
      ownerService: !selectedOwner && !selectedService,
    };
    setErrors(newErrors);
    return !Object.values(newErrors).includes(true);
  }, [selectedStartDate, selectedEndDate, selectedOwner, selectedService]);

  useEffect(() => {
    if (validateFields()) {
      onDateRangeSelect(selectedStartDate!, selectedEndDate!);
      onOwnerSelect?.(selectedOwner);
      onServiceSelect?.(selectedService);
    }
  }, [
    selectedStartDate,
    selectedEndDate,
    selectedOwner,
    selectedService,
    onDateRangeSelect,
    onOwnerSelect,
    onServiceSelect,
    validateFields
  ]);

  return (
    <MuiPickersUtilsProvider libInstance={moment} utils={MomentUtils}>
      <Box className={classes.container}>
        <FormControl className={classes.formItem} error={errors.startDate || errors.endDate}>
          <FormHelperText>Date Range:</FormHelperText>
          <DateRangePicker
            startDate={selectedStartDate}
            endDate={selectedEndDate}
            onStartDateSelect={date => {
              setSelectedStartDate(date || startDate);
              setErrors(prev => ({ ...prev, startDate: !date }));
            }}
            onEndDateSelect={date => {
              setSelectedEndDate(date);
              setErrors(prev => ({ ...prev, endDate: !date }));
            }}
            onReset={() => {
              setSelectedStartDate(startDate);
              setSelectedEndDate(endDate);
            }}
            minDate={minDate}
            maxDate={maxDate}
          />
          {(errors.startDate || errors.endDate) && (
            <Typography className={classes.errorText}>
              Both start date and end date are required.
            </Typography>
          )}
          <Typography className={classes.formInfo}>
            <i>max of 6 months</i>
          </Typography>
        </FormControl>

        <FormControl className={classes.formItem} error={errors.ownerService}>

          <EntityPicker
            type="owner"
            onSelect={(entities) => {
              handleSelect(entities, setSelectedOwner);
              setErrors(prev => ({ ...prev, ownerService: !entities.length && !selectedService }));
            }}
            initialSelected={initialOwner}
          />
          <EntityPicker
            type="service"
            onSelect={entities => {
              handleSelect(entities, setSelectedService);
              setErrors(prev => ({ ...prev, ownerService: !selectedOwner && !selectedService }));
            }}
          />
          {errors.ownerService && (
            <Typography className={classes.errorText}>
              Either Owner or Service is required.
            </Typography>
          )}
        </FormControl>
      </Box>
    </MuiPickersUtilsProvider>
  );
};

export default PullRequestsFilters;
