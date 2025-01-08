import React, { useEffect, useState } from 'react';
import {
  ButtonGroup,
  Button,
  MenuItem,
  Box,
  Menu,
  IconButton,
  FormHelperText,
} from '@material-ui/core';
import AccessTime from '@material-ui/icons/AccessTime';
import ArrowDropDown from '@material-ui/icons/ArrowDropDown';
import ArrowBackIos from '@material-ui/icons/ArrowBackIos';
import ArrowForwardIos from '@material-ui/icons/ArrowForwardIos';
import CloseIcon from '@material-ui/icons/Close';
import SearchIcon from '@material-ui/icons/Search';
import { DateTimePicker, MuiPickersUtilsProvider } from '@material-ui/pickers';
import MomentUtils from '@date-io/moment';
import moment from 'moment';

import { initialPeriod, rangeList } from './data';
import {
  Props,
  RangeItem,
  RangeTypeItem,
  SelectedPeriod,
  Status,
} from './types';
import { useStyles } from './styles';
import { MaterialUiPickersDate } from '@material-ui/pickers/typings/date';

export const calculateDate = (selected: SelectedPeriod): string => {
  const tempStartDate = moment();

  switch (selected.value.type) {
    case RangeTypeItem.minutes:
      return tempStartDate.subtract(selected.value.value, 'minutes').format();
    case RangeTypeItem.days:
      return tempStartDate.subtract(selected.value.value, 'days').format();
    case RangeTypeItem.month:
      return tempStartDate.subtract(selected.value.value, 'months').format();
    default:
      return tempStartDate.format();
  }
};

export const DateTimeRange = (props: Props) => {
  const now = new Date();
  const classes = useStyles();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [startDate, setStartDate] = useState<Date>(now);
  const [endDate, setEndDate] = useState<Date>(now);
  const [invalidDate, setInvalidDate] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(initialPeriod);

  useEffect(() => {
    setInvalidDate(startDate > endDate ? true : false);
  }, [endDate, startDate]);

  const handleOpenMenu = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = (selected: SelectedPeriod) => {
    setAnchorEl(null);
    setSelectedPeriod(selected);

    if (selected.value.type !== RangeTypeItem.custom) {
      props.callback(calculateDate(selected), moment().format());
    }
  };

  const handleBackMenuItem = () => {
    const temp = { ...selectedPeriod };

    if (temp.index - 1 >= 0) {
      temp.index = temp.index - 1;
      temp.value = rangeList[temp.group][temp.index];
    } else if (temp.group - 1 >= 0) {
      temp.group = temp.group - 1;
      temp.index = rangeList[temp.group].length - 1;
      temp.value = rangeList[temp.group][temp.index];
    }

    setSelectedPeriod(temp);

    props.callback(calculateDate(temp), moment().format());
  };

  const handleNextMenuItem = () => {
    const temp = { ...selectedPeriod };

    if (temp.index + 1 < rangeList[temp.group].length) {
      temp.index = temp.index + 1;
      temp.value = rangeList[temp.group][temp.index];
    } else if (temp.group + 1 < rangeList.length) {
      temp.group = temp.group + 1;
      temp.index = 0;
      temp.value = rangeList[temp.group][0];
    }

    setSelectedPeriod(temp);

    if (temp.value.type !== RangeTypeItem.custom) {
      props.callback(calculateDate(temp), moment().format());
    }
  };

  const handleStartDateChange = (date: MaterialUiPickersDate | null) => {
    if (date === null) throw new Error('Invalid start date.');
    setStartDate(date.toDate());
  };

  const handleEndDateChange = (date: MaterialUiPickersDate | null) => {
    if (date === null) throw new Error('Invalid end date.');
    setEndDate(date.toDate());
  };

  const handleSearch = () => {
    props.callback(moment(startDate).format(), moment(endDate).format());
  };

  return (
    <>
      {selectedPeriod.value.type === RangeTypeItem.custom && (
        <>
          <Box
            className={
              invalidDate ? classes.invalidRangeCustom : classes.rangeCustom
            }
          >
            <IconButton
              aria-label="close"
              color="primary"
              disabled={props.status === Status.Pending}
              className={classes.closeButton}
              onClick={() => {
                setSelectedPeriod({
                  group: 0,
                  index: 0,
                  value: rangeList[0][0],
                });
              }}
            >
              <CloseIcon
                fontSize="small"
                color={invalidDate ? 'error' : 'primary'}
              />
            </IconButton>
            <MuiPickersUtilsProvider libInstance={moment} utils={MomentUtils}>
              <DateTimePicker
                clearable
                label="Start date:"
                inputVariant="filled"
                value={startDate}
                maxDate={props.maxDate}
                minDate={props.minDate}
                onChange={handleStartDateChange}
                format="DD/MM/yyyy hh:mm:ss"
                disabled={props.status === Status.Pending}
              />
              <DateTimePicker
                className={classes.dateTimePicker}
                clearable
                value={endDate}
                onChange={handleEndDateChange}
                maxDate={props.maxDate}
                minDate={props.minDate}
                format="DD/MM/yyyy hh:mm:ss"
                label="End date:"
                inputVariant="filled"
                disabled={props.status === Status.Pending}
              />
            </MuiPickersUtilsProvider>
            <Button
              variant="contained"
              color="primary"
              disabled={invalidDate || props.status === Status.Pending}
              onClick={handleSearch}
            >
              <SearchIcon fontSize="large" />
            </Button>
          </Box>
          {invalidDate && (
            <FormHelperText error>
              The start date cannot be greater than the end date.
            </FormHelperText>
          )}
        </>
      )}
      {selectedPeriod.value.type !== RangeTypeItem.custom && (
        <ButtonGroup
          color="primary"
          aria-label="outlined primary button group"
          disabled={props.status === Status.Pending}
        >
          <Button
            onClick={handleBackMenuItem}
            disabled={selectedPeriod.group === 0 && selectedPeriod.index === 0}
          >
            <ArrowBackIos />
          </Button>
          <Button
            className={classes.period}
            aria-controls="simple-menu"
            aria-haspopup="true"
            onClick={handleOpenMenu}
          >
            <AccessTime className={classes.accessTime} />
            {selectedPeriod.value.label} ago
            <ArrowDropDown />
          </Button>
          <Button onClick={handleNextMenuItem}>
            <ArrowForwardIos />
          </Button>
        </ButtonGroup>
      )}
      <Menu
        className={classes.rangeMenu}
        id="simple-menu"
        anchorEl={anchorEl}
        keepMounted
        open={Boolean(anchorEl)}
        onClose={() => {
          handleCloseMenu(selectedPeriod);
        }}
      >
        {rangeList.map((rangeGroup: Array<RangeItem>, i: number) => {
          return (
            <div key={`menu-group-${i}`}>
              {rangeGroup.map((el: RangeItem, j: number) => {
                return (
                  <MenuItem
                    key={`menu-group-${i}-item-${j}`}
                    className={classes.menuItem}
                    onClick={() => {
                      handleCloseMenu({
                        group: i,
                        index: j,
                        value: el,
                      });
                    }}
                  >
                    {el.label}
                  </MenuItem>
                );
              })}
              {i < rangeList.length - 1 && <MenuItem divider />}
            </div>
          );
        })}
      </Menu>
    </>
  );
};
