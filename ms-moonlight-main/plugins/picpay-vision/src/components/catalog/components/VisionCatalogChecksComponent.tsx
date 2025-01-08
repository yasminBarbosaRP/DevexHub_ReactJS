import {
  VisionChecks,
  VisionToolCheckMetric,
  VisionToolStatus,
} from '@internal/plugin-picpay-vision-backend';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
  makeStyles,
} from '@material-ui/core';
import React, { useEffect, useState } from 'react';
import CheckIcon from '@material-ui/icons/Check';
import CloseIcon from '@material-ui/icons/Close';
import DocsIcon from '@material-ui/icons/Description';
import SyncIcon from '@material-ui/icons/Sync';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

import { VisionScore } from '../../commons/VisionScoreComponent';

type VisionCatalogChecksProps = {
  visionChecksResponse: VisionChecks;
  isRefreshing: boolean;
  onEnableTool: (toolId: string) => void;
  onDisableTool: (toolId: string) => void;
  onRefresh: () => void;
};

const useStyles = makeStyles(theme => ({
  container: {
    width: '100%',
    backgroundColor: theme.palette.background.paper,
    borderRadius: '4px',
  },

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  rotate: {
    animation: '$rotate 1.5s linear infinite both',
  },

  title: {
    margin: '12px 24px',
  },

  toolOptionMenu: {
    borderRight: '1px solid #ffffff1f',
    minHeight: '100%',
  },

  toolOption: {
    display: 'flex',
    padding: '0 20px',
    minHeight: '48px',
    alignItems: 'center',
    justifyContent: 'space-between',
    cursor: 'pointer',

    '&:hover': {
      backgroundColor: theme.palette.navigation.navItem?.hoverBackground,
    },

    '&.selected': {
      backgroundColor: theme.palette.navigation.navItem?.hoverBackground,
      borderLeft: `3px solid ${theme.palette.primary.main}`,
      paddingLeft: '17px',
    },
  },

  checksContent: {
    minHeight: '480px',
  },

  toolChecks: {
    margin: '20px',
  },

  toolChecksTitle: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  toolChecksContent: {
    marginTop: '24px',
  },

  toolCheckItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
  },

  toolCheckItemEnd: {
    display: 'flex',
    marginLeft: 'auto',
    gap: '4px',
  },

  toolCheckItemScore: {
    paddingTop: '20px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
    minHeight: '100%',
  },

  disableToolButton: {
    marginTop: 'auto',
    marginBottom: '8px',
    textTransform: 'none',
  },

  '@keyframes rotate': {
    '0%': {
      transform: 'rotate(0)',
    },
    '100%': {
      transform: 'rotate(-360deg)',
    },
  },
}));

const PassIcon = () => <CheckIcon style={{ color: '#4BB543' }} />;

const FailedIcon = () => <CloseIcon color="error" />;

const DisabledIcon = () => (
  <Box
    style={{
      width: '24px',
      height: '24px',
      textAlign: 'center',
    }}
  >
    <span style={{ color: '#808080', fontSize: '20px', lineHeight: '1' }}>
      -
    </span>
  </Box>
);
const getToolIconFeedback = (status: VisionToolStatus) => {
  switch (status) {
    case 'PASS':
      return <PassIcon />;
    case 'FAILED':
      return <FailedIcon />;
    case 'DISABLED':
    default:
      return <DisabledIcon />;
  }
};

const VisionToolCheckAccordion = ({
  metric,
}: {
  metric: VisionToolCheckMetric;
}) => {
  const classes = useStyles();

  const isExpandable = metric.metricDetails;

  const [expanded, setExpanded] = useState(false);

  const handleChange = () => {
    if (isExpandable) {
      setExpanded(!expanded);
    }
  };

  return (
    <Accordion expanded={expanded} onChange={handleChange}>
      <AccordionSummary
        style={{ cursor: isExpandable ? 'pointer' : 'default' }}
        expandIcon={isExpandable ? <ExpandMoreIcon /> : null}
      >
        <Box key={metric.metricName} className={classes.toolCheckItem}>
          {getToolIconFeedback(metric.status)}
          <Typography>{metric.metricName}<b>{metric.metricValue ? ` - ${metric.metricValue}` : ''}</b></Typography>

          <Box className={classes.toolCheckItemEnd}>
            <Typography component="div">
              {metric.required ? (
                <Box sx={{ fontWeight: 'bold' }}>Required</Box>
              ) : (
                <Box sx={{ fontStyle: 'italic' }}>Optional</Box>
              )}
            </Typography>
            {metric.metricDocUrl && (
              <IconButton size="small" href={metric.metricDocUrl}>
                <DocsIcon fontSize="small" />
              </IconButton>
            )}
          </Box>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Typography>{metric.metricDetails}</Typography>
      </AccordionDetails>
    </Accordion>
  );
};

const VisionToolChecksContent = ({
  selectedTool,
  onEnableTool,
  onDisableTool,
  isRefreshing,
}: {
  selectedTool: VisionChecks['data'][number];
  onEnableTool: (toolId: string) => void;
  onDisableTool: (toolId: string) => void;
  isRefreshing: boolean;
}) => {
  const classes = useStyles();

  const ToolTitle = () => (
    <Box className={classes.toolChecksTitle}>
      <Typography variant="h6">{selectedTool.data.toolName}</Typography>

      {selectedTool.data.docsUrl && (
        <Tooltip title={`Go to ${selectedTool.data.toolName} documentation`}>
          <IconButton size="small" href={selectedTool.data.docsUrl}>
            <DocsIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}
    </Box>
  );

  switch (selectedTool.behavior) {
    case 'DISABLED':
      return (
        <Grid className={classes.toolChecks} item xs>
          <ToolTitle />
          <Box className={classes.toolChecksContent}>
            <Typography>
              This tool is currently disabled for this project.{' '}
              <Button
                className={classes.disableToolButton}
                disabled={isRefreshing}
                color="primary"
                size="small"
                style={{ marginBottom: '0' }}
                onClick={() => {
                  onEnableTool(selectedTool.data.toolId);
                }}
              >
                enable tool
              </Button>
            </Typography>
          </Box>
        </Grid>
      );
    case 'PASS':
    case 'FAILED':
    default:
      return (
        <>
          <Grid className={classes.toolChecks} item xs>
            <ToolTitle />
            <Box className={classes.toolChecksContent}>
              {selectedTool.data.metrics.map(metric => (
                <VisionToolCheckAccordion
                  metric={metric}
                  key={metric.metricName}
                />
              ))}
            </Box>
          </Grid>

          <Grid item xs={2}>
            <Box className={classes.toolCheckItemScore}>
              <Typography variant="h6">Score</Typography>
              <VisionScore percentage={selectedTool.data.toolScore} />
              <Button
                className={classes.disableToolButton}
                disabled={isRefreshing}
                color="primary"
                onClick={() => {
                  onDisableTool(selectedTool.data.toolId);
                }}
              >
                disable tool
              </Button>
            </Box>
          </Grid>
        </>
      );
  }
};

export const VisionCatalogChecks = ({
  visionChecksResponse,
  onDisableTool,
  onEnableTool,
  onRefresh,
  isRefreshing,
}: VisionCatalogChecksProps) => {
  const classes = useStyles();

  const [selectedTool, setSelectedTool] = useState(
    visionChecksResponse.data[0],
  );

  useEffect(() => {
    setSelectedTool(visionChecksResponse.data[0]);
  }, [visionChecksResponse]);

  return (
    <Box className={classes.container}>
      <Box className={classes.header}>
        <Typography className={classes.title} variant="h5">
          Checks
        </Typography>
        <Tooltip
          className={isRefreshing ? classes.rotate : ''}
          title={
            isRefreshing
              ? 'Score is refreshing checks for this project'
              : 'Refresh Score'
          }
        >
          <IconButton
            onClick={() => {
              if (!isRefreshing) {
                onRefresh();
              }
            }}
          >
            <SyncIcon />
          </IconButton>
        </Tooltip>
      </Box>
      <Divider />

      <Grid className={classes.checksContent} container spacing={0}>
        <Grid className={classes.toolOptionMenu} item xs={2}>
          {visionChecksResponse.data.map(visionChecks => (
            <Box
              key={visionChecks.data.toolName}
              onClick={() => setSelectedTool(visionChecks)}
              className={`${classes.toolOption} ${
                selectedTool.data.toolName === visionChecks.data.toolName
                  ? 'selected'
                  : ''
              }`}
            >
              <Typography variant="subtitle1">
                {visionChecks.data.toolName}
              </Typography>

              {getToolIconFeedback(visionChecks.behavior)}
            </Box>
          ))}
        </Grid>
        <VisionToolChecksContent
          selectedTool={selectedTool}
          onDisableTool={onDisableTool}
          onEnableTool={onEnableTool}
          isRefreshing={isRefreshing}
        />
      </Grid>
    </Box>
  );
};
