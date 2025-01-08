import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  contentStatus: { display: 'flex', alignItems: 'center' },
  success: {
    color: theme.palette.success.main,
    borderRadius: '50%',
    maxHeight: '15px',
    width: '15px',
  },
  error: {
    color: theme.palette.error.main,
    borderRadius: '50%',
    maxHeight: '15px',
    width: '15px',
  },
  running: { color: theme.palette.info.main, maxHeight: '15px', width: '15px' },
  label: { marginLeft: theme.spacing(1) },
}));
