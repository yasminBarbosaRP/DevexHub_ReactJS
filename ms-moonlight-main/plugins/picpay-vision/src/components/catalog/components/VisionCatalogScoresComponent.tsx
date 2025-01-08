import React from 'react';
import { VisionScore } from '../../commons/VisionScoreComponent';
import {
  Box,
  Container,
  Tooltip,
  Typography,
  makeStyles,
} from '@material-ui/core';
import InfoRounded from '@material-ui/icons/InfoRounded';
import { VisionOverview } from '@internal/plugin-picpay-vision-backend';

type VisionCatalogScoresProps = {
  visionOverviewResponse: VisionOverview;
};

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    marginTop: '50px',
  },

  scoreWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },

  scoreTitleWrapper: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
}));

export const VisionCatalogScores = ({
  visionOverviewResponse,
}: VisionCatalogScoresProps) => {
  const classes = useStyles();

  switch (visionOverviewResponse.behavior) {
    case 'DETAILED':
      return (
        <Container className={classes.container}>
          <Box className={classes.scoreWrapper}>
            <Box className={classes.scoreTitleWrapper}>
              <Typography variant="h6">Best Score</Typography>
              <Typography variant="subtitle1">
                {visionOverviewResponse.data.bestToolScore.name}
              </Typography>
            </Box>
            <VisionScore
              percentage={visionOverviewResponse.data.bestToolScore.score}
            />
          </Box>
          <Box className={classes.scoreWrapper}>
            <Typography variant="h5">
              Score{' '}
              <Tooltip title="Score is a calculation based on every other tool score">
                <InfoRounded style={{ paddingTop: '6px' }} />
              </Tooltip>
            </Typography>

            <VisionScore
              percentage={visionOverviewResponse.data.visionScore}
              size="large"
            />
          </Box>
          <Box className={classes.scoreWrapper}>
            <Box className={classes.scoreTitleWrapper}>
              <Typography variant="h6">Worst Score</Typography>
              <Typography variant="subtitle1">
                {visionOverviewResponse.data.worstToolScore.name}
              </Typography>
            </Box>
            <VisionScore
              percentage={visionOverviewResponse.data.worstToolScore.score}
            />
          </Box>
        </Container>
      );

    case 'SIMPLIFIED':
    default:
      return (
        <Container className={classes.container}>
          <Box className={classes.scoreWrapper}>
            <Typography variant="h5">
              Score{' '}
              <Tooltip title="Score is a calculation based on every other tool score">
                <InfoRounded style={{ paddingTop: '6px' }} />
              </Tooltip>
            </Typography>

            <VisionScore
              percentage={visionOverviewResponse.data.visionScore}
              size="large"
            />
          </Box>
        </Container>
      );
  }
};
