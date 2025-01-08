import React, { useContext, useEffect, useState } from 'react';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import { visionApiRef } from '@internal/plugin-picpay-vision';
import { useApi } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core';
import { CustomGaugeCard } from './CustomGaugeCard';

const linkInfo = { title: 'View details', link: '/tech-metrics/test-certified' };
const sourceTestCertified = 3;

const useStyles = makeStyles(() => ({
  wrapper: {
    '& > div': {
      width: '96.5%',
    },
  },
}));

export const getColor = (value: number): string => (value > 0.5 ? 'green' : 'red');

export const ScoreTestCertified = () => {
  const classes = useStyles();
  const { userGroups } = useContext(UserGroupsContext);
  const [valueProgress, setValueProgress] = useState(0);

  const visionApi = useApi(visionApiRef);

  useEffect(() => {
    const fetchScore = async () => {
      if (userGroups && userGroups.length > 0) {
        const groups = userGroups.map(group => group.label);
        const response = await visionApi.getGroupsScore(sourceTestCertified, groups);
        if (response && typeof response.score === 'number') {
          setValueProgress(Math.round(response.score));
        }
      }
    };

    fetchScore();
  }, [visionApi, userGroups]);

  return (
    <div className={classes.wrapper}>
      <CustomGaugeCard
        title="Test Certified"
        subheader="Quality metrics overview"
        deepLink={linkInfo}
        progress={valueProgress / 100}
        description="Overall team performance on test metrics"
        size="normal"
        variant={undefined}
        alignGauge="normal"
        getColor={getColor}
      />
    </div>
  );
};
