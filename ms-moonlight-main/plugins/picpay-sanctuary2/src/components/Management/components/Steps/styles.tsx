import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  title: { flex: 1 },
  steps: { width: '100%', margin: theme.spacing(1) },
  stepper: { margin: 0, padding: 0 },
  contentTitle: { display: 'flex', width: '100%', alignItems: 'center' },
  stepMessage: { display: 'block', fontFamily: 'sans-serif' },
  stepMessageWarning: {
    display: 'block',
    color: theme.palette.status.warning,
    fontFamily: 'sans-serif',
  },
  stepMessageError: {
    display: 'block',
    color: theme.palette.status.error,
    fontFamily: 'sans-serif',
  },
}));
