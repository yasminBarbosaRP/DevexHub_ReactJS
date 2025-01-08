import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  question: {
    margin: theme.spacing(2, 0),
  },
  textField: { width: '100%', marginTop: theme.spacing(2) },
  formHelper: { textAlign: 'right' },
  actions: {
    display: 'flex',
    padding: theme.spacing(2, 0),
    justifyContent: 'end',
  },
  button: {
    marginLeft: theme.spacing(1),
  },
  progress: {
    marginRight: theme.spacing(1.5),
  },
  successMessage: {
    margin: theme.spacing(5),
  },
}));
