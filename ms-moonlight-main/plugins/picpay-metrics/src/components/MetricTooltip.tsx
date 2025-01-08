import React, { useState } from 'react';
import {
  Box,
  ClickAwayListener,
  Link,
  Tooltip,
  Typography,
  makeStyles,
} from '@material-ui/core';
import InfoIcon from '@material-ui/icons/Info';
import {
  MetricPerformance,
  MetricsResponseBehaviorsWithoutEmpty,
} from '@internal/plugin-picpay-metrics-backend';

const useStyles = makeStyles(theme => ({
  tooltip: {
    maxWidth: '400px',
    backgroundColor: theme.palette.background.default,
    color: theme.palette.text.primary,
  },
  tooltipTextContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    padding: '8px',
  },
}));

const TooltipText = ({
  tooltipSource,
  metricType,
}: {
  tooltipSource: 'METRIC_TITLE' | 'METRIC_PERFORMANCE';
  metricType: MetricsResponseBehaviorsWithoutEmpty;
}) => {
  const classes = useStyles();

  const METRIC_TITLE_TEXT_MAP: {
    [k in typeof metricType]: { [k: string]: string };
  } = {
    LEAD_TIME: {
      paragraph1:
        'Measures the speed of code and software development, helping to better understand the life cycle of solutions created by the team. Naturally, the ideal is that adaptations are made as quickly as possible.',
      paragraph2:
        'To calculate Lead Time, we relate all deploys made during the researched period, retrieve all PRs/commits related to these deploys, and then calculate the median to determine the time it took from the first commit until the deploy was successfully completed.',
    },
    DEPLOYMENT_FREQUENCY: {
      paragraph1:
        'Evaluates the frequency with which software is updated (number of deploys in production) with the aim of promoting improvements for the end user. This can involve deploying new code or making small daily fixes.',
      paragraph2:
        'A high rate of deploys in production indicates that the team is delivering value more quickly, as well as promoting continuous improvement. To calculate, we measure the number of implementations in a previously determined time period.',
    },

    CFR: {
      paragraph1:
        'As the name suggests, measures changes that resulted in some failure and require correction. This is a rate that should be kept low to ensure the efficiency of deployments.',
      paragraph2:
        'To calculate the Change Failure Rate, we divide the number of defects identified by the number of deployments in the evaluated period.',
    },
  };

  const METRIC_PERFORMANCE_TEXT_MAP: {
    [m in typeof metricType]: {
      [k in Exclude<MetricPerformance, 'N/A'>]: string;
    };
  } = {
    LEAD_TIME: {
      ELITE: 'Less than 1 day.',
      HIGH: 'Between 1 day and 1 week.',
      MEDIUM: 'Between 1 week and 1 month.',
      LOW: 'Above 1 month.',
    },
    DEPLOYMENT_FREQUENCY: {
      ELITE: 'One or more deploys per day.',
      HIGH: 'One or more deploys within seven days.',
      MEDIUM: 'One or more deploys within thirty days.',
      LOW: 'No deploys in the last thirty days.',
    },

    CFR: {
      ELITE: 'Up to 5% failure rate.',
      HIGH: 'Up to 10% failure rate.',
      MEDIUM: 'Up to 15% failure rate.',
      LOW: 'Above 15% failure rate.',
    },
  };

  const MetricTitleText = (
    <Box className={classes.tooltipTextContainer}>
      <Typography>{METRIC_TITLE_TEXT_MAP[metricType].paragraph1}</Typography>

      <Typography>{METRIC_TITLE_TEXT_MAP[metricType].paragraph2}</Typography>

      <Typography>
        To learn more, download the official document "State of DevOps Report":
      </Typography>

      <Typography>
        <Link href="https://cloud.google.com/devops/state-of-devops">
          https://cloud.google.com/devops/state-of-devops
        </Link>
      </Typography>
    </Box>
  );

  const MetricPerformanceText = (
    <Box className={classes.tooltipTextContainer}>
      <Typography>
        ELITE: {METRIC_PERFORMANCE_TEXT_MAP[metricType].ELITE}
      </Typography>

      <Typography>
        HIGH: {METRIC_PERFORMANCE_TEXT_MAP[metricType].HIGH}
      </Typography>

      <Typography>
        MEDIUM: {METRIC_PERFORMANCE_TEXT_MAP[metricType].MEDIUM}
      </Typography>

      <Typography>
        LOW: {METRIC_PERFORMANCE_TEXT_MAP[metricType].LOW}
      </Typography>
    </Box>
  );

  return tooltipSource === 'METRIC_TITLE'
    ? MetricTitleText
    : MetricPerformanceText;
};

export const MetricTooltip = ({
  tooltipSource,
  metricType,
}: {
  tooltipSource: 'METRIC_TITLE' | 'METRIC_PERFORMANCE';
  metricType: MetricsResponseBehaviorsWithoutEmpty;
}) => {
  const classes = useStyles();

  const [open, setOpen] = useState(false);

  const handleTooltipClose = () => {
    setOpen(false);
  };

  const handleTooltipOpen = () => {
    setOpen(true);
  };

  return (
    <ClickAwayListener onClickAway={handleTooltipClose}>
      <div>
        <Tooltip
          style={{ cursor: 'pointer' }}
          classes={{ tooltip: classes.tooltip }}
          placement={tooltipSource === 'METRIC_PERFORMANCE' ? 'left' : 'top'}
          interactive
          PopperProps={{
            disablePortal: true,
          }}
          onClose={handleTooltipClose}
          open={open}
          disableFocusListener
          disableHoverListener
          disableTouchListener
          title={
            <TooltipText
              tooltipSource={tooltipSource}
              metricType={metricType}
            />
          }
        >
          <InfoIcon onClick={handleTooltipOpen} fontSize="small" />
        </Tooltip>
      </div>
    </ClickAwayListener>
  );
};
