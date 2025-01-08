import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  formRoot: {
    '& > *': {
      margin: theme.spacing(1),
    },
  },
  boxWidth: {
    width: 500
  },
  card: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '4px',
  },

  cardHeader: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
  cardContent: {
    padding: '20px',
  },
}));