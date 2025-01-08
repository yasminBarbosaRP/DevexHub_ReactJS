import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  fieldsPadding: {
    paddingBottom: theme.spacing(2),
  },
  buttonGroup: { display: 'flex' },
  buttonMargin: {
    marginTop: theme.spacing(4),
    flex: 1,
  },
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
  cardHeader: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    borderBottom: `1px solid ${theme.palette.divider}`,
  },
}));
