import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  iconButton: { height: 72 },
  star: {
    margin: theme.spacing(2, 0),
    fontSize: 48,
  },
}));
