import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  reviewer: {
    backgroundColor: theme.palette.success.main,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(0.5),
  },
  reviewerPending: {
    backgroundColor: theme.palette.background.default,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(0.5),
  },
  reviewerRejected: {
    backgroundColor: theme.palette.warning.main,
    padding: theme.spacing(0.5, 1),
    borderRadius: theme.spacing(0.5),
    display: 'flex',
    alignItems: 'center',
    margin: theme.spacing(0.5),
  },
  icon: {
    marginLeft: theme.spacing(0.5),
  },
}));
