import React from 'react';
import { makeStyles } from '@material-ui/core/styles';

const useStyles = makeStyles(() => ({
  textAdded: {
    color: '#0096FF',
  },
  textRemoved: {
    color: '#DC143C',
  },
}));

export const LinesChangesColumn: React.FC<{ linesAdded: number; linesRemoved: number }> = ({ linesAdded, linesRemoved }) => {
  const classes = useStyles();

  return (
    <div>
      <span className={classes.textAdded}>+{linesAdded}</span>{' '}
      <span className={classes.textRemoved}>-{linesRemoved}</span>
    </div>
  );
};
