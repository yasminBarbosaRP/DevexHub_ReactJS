import React from 'react';
import { useStyles } from './styles';

interface Props {
  label: string;
  value: string;
}
export const Info = (props: Props) => {
  const { label, value } = props;
  const classes = useStyles();
  return (
    <p className={classes.info}>
      <strong>{label} </strong>
      {value}
    </p>
  );
};
