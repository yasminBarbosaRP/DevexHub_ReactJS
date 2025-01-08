import { makeStyles } from '@material-ui/core';

export const useStyles = makeStyles(() => ({
  stepper: {
    margin: 0,
    padding: 0,
  },
  floatRight: {
    float: 'right',
  },
  grid: {
    display: 'flex',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  description: {
    flex: 1,
  },
}));
