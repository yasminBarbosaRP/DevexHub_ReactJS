import { createStyles, makeStyles, Theme } from '@material-ui/core';

export const useStyles = makeStyles((_theme: Theme) =>
  createStyles({
    container: {
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
    },
    img: {
      width: '30%',
    },
  }),
);
