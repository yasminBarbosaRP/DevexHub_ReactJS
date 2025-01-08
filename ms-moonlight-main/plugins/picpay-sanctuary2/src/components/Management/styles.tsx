import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  buttonGroup: { display: 'flex' },
  buttonRename: { flex: 1 },
  buttonDelete: { flex: 1, marginLeft: 4 },
  info: { cursor: 'pointer', width: '100%' },
  w100: { width: '100%' },
  infoBeta: {
    display: 'flex',
    border: `1px solid ${theme.palette.grey[600]}`,
    borderRadius: theme.spacing(0.5),
    padding: theme.spacing(1),
    margin: theme.spacing(1, 0.6),
  },
  infoIcon: {
    marginRight: theme.spacing(0.5),
  },
  card: {
    backgroundColor: theme.palette.background.paper,
    borderRadius: '4px',
    display: 'flex',
    flexDirection: 'column',
    height: 'calc(100% - 10px)', // for pages without content header
    marginBottom: '10px',
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
