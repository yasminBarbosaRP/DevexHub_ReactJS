import { alpha, createStyles, makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) =>
  createStyles({
    period: {
      width: 212,
    },
    accessTime: {
      marginRight: 6,
    },
    rangeCustom: {
      display: 'flex',
      position: 'relative',
      padding: 12,
      border: `1px solid ${alpha(theme.palette.primary.main, 0.5)}`,
      borderRadius: 4,
    },
    invalidRangeCustom: {
      display: 'flex',
      position: 'relative',
      padding: 12,
      border: `1px solid ${alpha(theme.palette.error.main, 0.5)}`,
      borderRadius: 4,
    },
    closeButton: {
      position: 'absolute',
      right: -16,
      top: -36,
    },
    dateTimePicker: {
      margin: '0 16px',
    },
    rangeMenu: {
      marginTop: 70,
      width: 242,
    },
    menuItem: {
      width: 242,
    },
  }),
);
