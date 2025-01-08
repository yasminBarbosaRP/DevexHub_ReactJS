import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  textField: {
    width: '100%',
  },
  form: {
    display: 'block',
    marginTop: theme.spacing(1.5),
  },
  formActions: {
    float: 'right',
  },
  formAction: {
    margin: theme.spacing(1, 0, 0, 1),
  },
}));
