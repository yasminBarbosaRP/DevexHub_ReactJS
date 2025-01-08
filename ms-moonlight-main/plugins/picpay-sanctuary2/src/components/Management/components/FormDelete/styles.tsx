import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  textField: {
    width: '100%',
  },
  alert: {
    margin: theme.spacing(1.5, 0),
  },
  form: {
    display: 'block',
    marginTop: theme.spacing(1.5),
  },
  formActions: {
    display: 'flex',
    justifyContent: 'flex-end',
  },
  formAction: {
    margin: theme.spacing(1, 0, 0, 1),
  },
  formHelper: {
    textAlign: 'right',
  },
  progress: {
    marginTop: theme.spacing(2),
  },
  radioGroup: {
    display: 'flex',
    flexDirection: 'row',
  },
}));
