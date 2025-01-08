import { Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';

const useStyles = makeStyles(theme => ({
  tooltipContainer: {
    backgroundColor: theme.palette.background.default,
    borderRadius: '5px',
    display: 'flex',
    alignItems: 'center',
    flexDirection: 'column',
    padding: '16px',
    gap: '5px',
  },

  tooltipInfo: { display: 'flex', alignItems: 'center', gap: '10px' },
}));

export const ChartTooltip = ({
  pointLabel,
  color,
  text,
  hasDetails,
}: {
  pointLabel: number | string;
  color: string;
  text: string;
  hasDetails: boolean;
}) => {
  const classes = useStyles();

  return (
    <Box className={classes.tooltipContainer}>
      <Typography component="div">
        <Box fontWeight="fontWeightBold" fontSize={18}>
          {pointLabel}
        </Box>
      </Typography>
      <Box className={classes.tooltipInfo}>
        <Box
          style={{
            width: '12px',
            height: '12px',
            backgroundColor: color,
          }}
        />
        <Typography>
          <Box fontWeight="fontWeightMedium">{text}</Box>
        </Typography>
      </Box>
      {hasDetails && (
        <Typography style={{ marginTop: '8px' }} variant="body2">
          Click to expand
        </Typography>
      )}
    </Box>
  );
};
