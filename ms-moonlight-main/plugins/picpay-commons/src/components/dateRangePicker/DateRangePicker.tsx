import React, { useRef } from 'react';
import DatePicker from 'react-datepicker';
import EventIcon from '@material-ui/icons/Event';
import 'react-datepicker/dist/react-datepicker.css';
import { Box, useTheme } from '@material-ui/core';

type DateRangePickerProps = {
  onEndDateSelect: (endDate: Date | null) => void;
  onStartDateSelect: (startDate: Date | null) => void;
  onReset?: () => void;
  startDate?: Date;
  endDate?: Date | null;
  minDate?: Date;
  maxDate?: Date;
};

export const DateRangePicker = ({
  onEndDateSelect,
  onStartDateSelect,
  onReset,
  endDate,
  startDate,
  maxDate,
  minDate,
}: DateRangePickerProps) => {
  const datePickerRef = useRef<DatePicker<never, true>>(null);
  const theme = useTheme();

  return (
    <DatePicker
      ref={datePickerRef}
      shouldCloseOnSelect={false}
      startDate={startDate}
      endDate={endDate}
      selectsRange
      popperPlacement="bottom-start"
      minDate={minDate}
      maxDate={maxDate}
      onChange={([start, end]) => {
        if (start?.getTime() === end?.getTime()) {
          onReset?.();
          return;
        }

        onStartDateSelect(start);
        onEndDateSelect(end ?? null);

        if (start && end) {
          datePickerRef.current?.setOpen(false);
        }
      }}
      customInput={
        <Box
          style={{
            cursor: 'pointer',
            padding: '8px 2px 4px 0',
            borderBottom: `1px solid ${theme.palette.text.secondary}`,
            fontSize: '16px',
            display: 'flex',
            justifyContent: 'space-between',
          }}
        >
          {startDate?.toLocaleDateString('pt-BR')} -{' '}
          {endDate?.toLocaleDateString('pt-BR')}
          <EventIcon />
        </Box>
      }
    />
  );
};
