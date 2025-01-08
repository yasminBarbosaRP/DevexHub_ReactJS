import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  carousel: {
    width: '100%',
  },
  card: {
    margin: theme.spacing(2),
    borderRadius: '8px',
    alignItems: 'center',
    justifyContent: 'center',
    display: 'flex',
    width: '223px',
    height: '204px',
  },
  cardContent: {
    fontSize: '14px',
  },
  icon: {
    display: 'flex',
    width: '22px',
    height: '20px',
  },
  cardMedia: {
    marginBottom: '4px',
  },
  label: {
    marginTop: '23px',
    fontSize: theme.typography.pxToRem(20),
  },
}));
