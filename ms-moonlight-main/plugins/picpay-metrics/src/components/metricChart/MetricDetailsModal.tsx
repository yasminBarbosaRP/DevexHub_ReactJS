import React from 'react';
import {
  Box,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
  makeStyles,
} from '@material-ui/core';

import GitHubIcon from '@material-ui/icons/GitHub';
import { MetricChartDetailsModal } from '@internal/plugin-picpay-metrics-backend';
import { MetricDetailsAccordion } from './MetricDetailsAccordion';

const useStyles = makeStyles(theme => ({
  content: {
    display: 'flex',
    marginBottom: '16px',
    flexDirection: 'column',
    gap: '32px',
  },

  repositoryGroup: {
    boxShadow: '0px 3px 4px 0px rgba(0,0,0,0.25)',

    '& > *': {
      borderBottom: `1px solid ${theme.palette.divider}`,
    },

    '& > *:last-child': {
      borderBottom: 'none',
    },
  },

  repositoryGroupHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 12px',
  },
}));

export const MetricDetailsModal = ({
  open,
  data,
  onClose,
}: {
  open: boolean;
  data?: {
    details: MetricChartDetailsModal;
    metricName: string;
    metricValue: string;
    metricTimestamp: string;
  };
  onClose: () => void;
}) => {
  const classes = useStyles();

  if (!data) return null;

  return (
    <Dialog fullWidth maxWidth="md" open={open} onClose={onClose}>
      <DialogTitle>
        <Typography component="div">
          <Box fontWeight="fontWeightBold" fontSize={24}>
            {data.metricName} - {data.metricTimestamp} - {data.metricValue}
          </Box>
        </Typography>
      </DialogTitle>
      <DialogContent className={classes.content}>
        {data.details.repositories.map(repository => (
          <Box className={classes.repositoryGroup} key={repository.name}>
            <Box className={classes.repositoryGroupHeader}>
              <Typography component="div">
                <Box fontWeight="fontWeightBold" fontSize={20}>
                  {repository.name}
                </Box>
              </Typography>
              <IconButton
                style={{ padding: 0 }}
                href={repository.url}
                target="_blank"
              >
                <GitHubIcon />
              </IconButton>
            </Box>

            {repository.deploys.map(deploy => (
              <MetricDetailsAccordion deploy={deploy} />
            ))}
          </Box>
        ))}
      </DialogContent>
    </Dialog>
  );
};
