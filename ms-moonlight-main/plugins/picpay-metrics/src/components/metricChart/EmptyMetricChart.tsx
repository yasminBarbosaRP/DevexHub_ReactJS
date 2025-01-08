import { NoResultFeedback } from '@internal/plugin-picpay-commons';
import { Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles(() => ({
  emptyChart: {
    width: '500px',
    margin: '0 auto',
    height: 'calc(100% - 30px)',
  },
}));

export const EmptyMetricChart = ({
  noResultText,
}: {
  noResultText: string;
}) => {
  const classes = useStyles();
  return (
    <Box className={classes.emptyChart}>
      <NoResultFeedback
        contentComponent={
          <>
            <Typography component="div">
              <Box textAlign="center" fontWeight="fontWeightBold" fontSize={18}>
                {noResultText}
              </Box>
            </Typography>
            <Typography component="div">
              <Box textAlign="center" fontWeight="fontWeightBold" fontSize={18}>
                There is no deploys in the selected date range.
              </Box>
            </Typography>
          </>
        }
      />
    </Box>
  );
};
