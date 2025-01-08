import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  content: { width: '100%' },
  alert: {
    margin: theme.spacing(1, 0),
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'row',
  },
  confirm: {
    display: 'flex',
    alignItems: 'center',
  },
  progress: {
    marginTop: theme.spacing(2),
  },
}));
