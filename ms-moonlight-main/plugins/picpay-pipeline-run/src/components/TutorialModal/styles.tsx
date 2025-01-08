import { makeStyles } from '@material-ui/core/styles';

export const useStyles = makeStyles(theme => ({
  paper: {
    position: 'absolute',
    width: 636,
    height: 'auto',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: theme.palette.background.paper,
    boxShadow: theme.shadows[5],
    padding: theme.spacing(2, 4, 3),
    borderRadius: 16,
    textAlign: 'center',
  },
  buttonContainer: {
    display: 'flex',
    alignItems: 'center',
    marginTop: 16,
  },
  step: {
    float: 'right',
  },
  title: {
    marginBottom: 16,
    marginTop: 28,
  },
  nextButton: {
    backgroundColor: '#238662',
    '&:active': {
      backgroundColor: '#238662',
    },
    marginLeft: 16,
    color: '#FFFFFF',
  },
  skipButton: {
    color: '#FFFFFF',
    float: 'left',
  },
  previousButton: {
    backgroundColor: '#424242',
    '&:active': {
      backgroundColor: '#424242',
    },
    color: '#FFFFFF',
  },
  rightButton: {
    float: 'right',
    marginLeft: 245,
  },
}));
