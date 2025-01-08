import { makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((theme: Theme) => ({
  orgGrid: {
    paddingBottom: theme.spacing(1),
  },
  formSearch: {
    display: 'flex',
    width: '80vw',
    justifyContent: 'center',
    flexWrap: 'nowrap',
    borderRadius: '8px',
    paddingRight: '25vw',
    paddingLeft: '20vw',
    margin: theme.spacing(5, 5),
  },
  buttonSearch: {
    marginLeft: theme.spacing(1),
  },

  container: {
    [theme.breakpoints.up('md')]: {
      flexDirection: 'row',
      flexWrap: 'nowrap',
    },
  },

  grid: {
    borderRadius: '8px',
    padding: '15px !important',
    backgroundColor: theme.palette.background.paper,
    flexDirection: 'row',
    marginLeft: theme.spacing(1),
    [theme.breakpoints.down('sm')]: {
      marginBottom: theme.spacing(2),
    }
  },

  coreBox: {
    display: 'flex',
    float: 'right',
    margin: theme.spacing(1, 1),
  },

  divIcon: {
    margin: theme.spacing(1, 0, 0, 0),
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
    flexDirection: 'row',
    height: '2.5vw',
  },

  divAjust: {
    paddingTop: theme.spacing(1),
    alignItems: 'center',
    justifyContent: 'center',
  },

  search: {
    backgroundColor: theme.palette.background.paper,
  },
  spanSquad: {
    fontWeight: 'bold',
    margin: theme.spacing(0.5, 1),
  },

  helloWithSquad: {
    marginBottom: theme.spacing(1),
  },
  chip: {
    margin: theme.spacing(0.5, 1),
    '& .MuiChip-icon': {
      fontSize: '18px',
      marginLeft: theme.spacing(0.5),
      color: '#616161',
    },
  },
  squads: {
    marginBottom: theme.spacing(3),
    height: '1.2vw',
    width: '15vw',
  },

  avatar: {
    margin: theme.spacing(0.5, 1),
    width: '50px',
    height: '50px',
  },

  avatarList: {
    padding: theme.spacing(2, 0),
  },
  showMoreButton: {
    margin: theme.spacing(1),
    borderRadius: '16vw',
    backgroundColor: '#248464',
    height: '1.3vw',
    fontSize: '12px',
    fontColor: 'white',
  },
  showMoreButtonAvartar: {
    margin: theme.spacing(0.5),
    borderRadius: '50%',
    fontSize: '100%',
  },
  textButton: {
    fontColor: 'white',
  },
  spanCenter: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    margin: theme.spacing(9),
    flexWrap: 'nowrap',
  },
}));
