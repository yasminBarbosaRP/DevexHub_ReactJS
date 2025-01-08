import { makeStyles } from '@material-ui/core';

export const useStyles = makeStyles(() => ({
  box: {
    padding: '0 16px',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
  },
  title: {
    width: '100%',
    fontWeight: 'bold',
  },
}));
