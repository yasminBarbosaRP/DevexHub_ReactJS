import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  content: { width: '100%', margin: theme.spacing(1, 0) },
  infoOutlined: { marginRight: theme.spacing(1) },
  title: { display: 'flex', alignItems: 'center' },
  copyLink: {
    display: 'flex',
    marginTop: theme.spacing(2),
    alignItems: 'center',
  },
  textField: { flex: 1 },
}));
