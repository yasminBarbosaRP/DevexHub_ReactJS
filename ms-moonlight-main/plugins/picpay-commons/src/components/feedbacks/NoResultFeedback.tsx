import { Grid } from '@material-ui/core';
import React, { ReactElement } from 'react';
import AttentionIcon from '../../assets/feedback/attention.svg';
import { useStyles } from './styles';

export const NoResultFeedback = (
  props: { content?: string; contentComponent?: ReactElement } | undefined,
) => {
  const classes = useStyles();

  return (
    <Grid container spacing={0} className={classes.container}>
      <img src={AttentionIcon} className={classes.img} alt="no results found" />
      {props?.contentComponent ? (
        props.contentComponent
      ) : (
        <h2>{props?.content ?? 'No results found'}</h2>
      )}
    </Grid>
  );
};
