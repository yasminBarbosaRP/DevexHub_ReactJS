import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Theme,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { PullRequestResponse } from '@internal/plugin-picpay-metrics-backend';

const useStyles = makeStyles((theme: Theme) => ({
  chartsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '32px',
    width: 'calc(100% -230px)',
  },
  cardInfo: {
    color: theme.palette.textSubtle,
    fontSize: '0.75rem',
  },
  cardTitle: {
    color: theme.palette.textSubtle,
    fontSize: '1rem',
  },
  cardContent: {
    minHeight: '120px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
    alignItems: 'center',
    textAlign: 'center',
  },
  card: {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    height: '100%',
  },
}));

type PullRequestsCardsProps = {
  data?: PullRequestResponse;
};

const PullRequestsCards: React.FC<PullRequestsCardsProps> = ({ data }) => {
  const classes = useStyles();
  return (
    <Box className={classes.chartsContainer}>
      <Grid container spacing={2} justifyContent="space-between">
        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Open Pull Requests
              </Typography>
              <Typography variant="h5">
                {data?.openPullRequests ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Merged Pull Requests
              </Typography>
              <Typography variant="h5">
                {data?.mergedPullRequests ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Closed Pull Requests
              </Typography>
              <Typography variant="h5">
                {data?.closedPullRequests ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Pull Requests Opened by Other Teams
              </Typography>
              <Typography variant="h5">
                {data?.otherTeamsOpenPullRequests ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Average Review Time
              </Typography>
              <Typography variant="h5">
                {data?.averageTimeToRequiredReview.toFixed(2) ?? 0}
              </Typography>
              <Typography className={classes.cardInfo}>
                <i>In Hours</i>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Average Time to First Review
              </Typography>
              <Typography variant="h5">
                {data?.averageTimeToStartReview.toFixed(2) ?? 0}
              </Typography>
              <Typography className={classes.cardInfo}>
                <i>In Hours</i>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Average Time to Merge
              </Typography>
              <Typography variant="h5">
                {data?.averageOpenTime.toFixed(2) ?? 0}
              </Typography>
              <Typography className={classes.cardInfo}>
                <i>In Hours</i>
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={4} lg={3}>
          <Card className={classes.card} variant="outlined">
            <CardContent className={classes.cardContent}>
              <Typography className={classes.cardTitle} gutterBottom>
                Average Files Changed
              </Typography>
              <Typography variant="h5">
                {data?.averageFilesChanged ?? 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default PullRequestsCards;
