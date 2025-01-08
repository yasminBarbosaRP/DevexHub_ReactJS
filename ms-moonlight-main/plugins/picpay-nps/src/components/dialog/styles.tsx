import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  header: {
    display: 'flex',
    width: '100%',
    position: 'relative',
    justifyContent: 'space-between',
    verticalAlign: 'center',
  },
  title: {
    position: 'relative',
    width: 'width: calc(100% - 65px)',
  },
  closeButton: {
    height: 50,
    margin: theme.spacing(1),
  },
  content: {
    width: 608,
    maxWidth: '100%',
    textAlign: 'center',
  },
}));
