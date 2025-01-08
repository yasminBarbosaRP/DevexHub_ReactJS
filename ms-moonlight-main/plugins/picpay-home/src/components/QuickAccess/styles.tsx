import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  carousel: {
    width: '100%',
  },
  card: {
    display: 'flex',
    margin: theme.spacing(2),
    borderRadius: '8px',
  },
  cardContent: {
    display: 'flex',
    padding: '8px',
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    padding: '0 8px',
    whiteSpace: 'nowrap',
    fontWeight: 600,
  },
  icon: {
    width: '45px',
    height: '45px',
  },
}));
