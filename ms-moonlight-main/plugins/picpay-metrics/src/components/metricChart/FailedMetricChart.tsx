import { NoResultFeedback } from '@internal/plugin-picpay-commons';
import { Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles(() => ({
  failedChart: {
    width: '500px',
    margin: '0 auto',
    height: 'calc(100% - 30px)',
  },
}));

export const FailedMetricChart = () => {
  const classes = useStyles();
  return (
    <Box className={classes.failedChart}>
      <NoResultFeedback
        contentComponent={
          <>
            <Typography component="div">
              <Box textAlign="center" fontWeight="fontWeightBold" fontSize={18}>
                There was a problem trying to load the entity metrics.
              </Box>
            </Typography>
            <Typography component="div">
              <Box textAlign="center" fontWeight="fontWeightBold" fontSize={18}>
                Please try again later.
              </Box>
            </Typography>
          </>
        }
      />
    </Box>
  );
};
