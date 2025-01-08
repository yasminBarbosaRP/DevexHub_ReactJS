import React from 'react';
import { Card, Typography, Box, Divider } from '@material-ui/core';

import { useStyles } from './styles';

export const ComposableSection = (props: any) => {
  const classes = useStyles();
  return (
    <Card>
      <Box className={classes.box}>
        <Typography className={classes.title}>
          <strong>{props.title}</strong>
        </Typography>
        {props.settings}
      </Box>
      <Divider />
      <div>{props.children}</div>
    </Card>
  );
};
