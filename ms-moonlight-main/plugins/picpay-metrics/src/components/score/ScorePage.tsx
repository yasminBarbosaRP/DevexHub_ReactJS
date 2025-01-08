import React, { useState, useEffect, useContext } from "react";
import { Box, makeStyles } from "@material-ui/core";
import { GuardRailTable, MetricsData } from "./GuardRail";
import ScoreFilter from "./ScoreFilter";
import { visionApiRef } from '@internal/plugin-picpay-vision';
import { useApi } from '@backstage/core-plugin-api';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import { SonarMetrics } from "./Sonar"
import { MutationMetrics } from "./Mutation"


const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    gap: '32px',
    marginRight: '64px',
    alignItems: 'flex-start',
    maxWidth: '100%',
  },
  filtersContainer: {
    minWidth: '230px',
  },
  contentContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
    width: '100%',
  },
  sideBySide: {
    display: 'flex',
    gap: '11px',
    width: '100%',
  },
  halfWidth: {
    width: '50%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'space-between',
  },
  wideComponent: {
    width: '100%',
  },
}));

export const ScorePage = () => {
  const classes = useStyles();
  const visionApi = useApi(visionApiRef);
  const { userGroups } = useContext(UserGroupsContext);
  
  const [metricsData, setMetricsData] = useState<MetricsData[]>([]);
  const [page, setPage] = useState(1);
  const [ownerName, setOwnerName] = useState<string | undefined>(undefined);
  

  useEffect(() => {
    const fetchMetrics = async () => {
      const metrics = ["Guard Rail SONAR", "Guard Rail MUTATION", "Guard Rail END-TO-END"];
      if (userGroups && userGroups.length > 0) {
        const groups = userGroups.map(group => group.label);          
        const response = await visionApi.getScoreTestMetricsDetails(3, groups, metrics);
    
        if (response && response.projects) {
          const formattedData: MetricsData[] = response.projects.map(project => {
            const metricsMap = project.metrics.reduce((acc, metric) => {
              const metricName = metric.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
              acc[metricName] = metric.pass;
              return acc;
            }, {} as Record<string, boolean>);
            return {
              squad: project.squad ? project.squad.trim() : 'Unknown Squad', 
              service: project.name,
              sonar: metricsMap.guard_rail_sonar ?? false,
              mutation: metricsMap.guard_rail_mutation ?? false,
              endToEnd: metricsMap.guard_rail_end_to_end ?? false
            };
          });
  
          setMetricsData(formattedData);
        }
      }
    };
  
    fetchMetrics();
  }, [visionApi, userGroups]);

  return (
    <Box className={classes.container}>
      <Box className={classes.filtersContainer}>
        <ScoreFilter onOwnerSelect={(owner) => setOwnerName(owner ?? undefined)} />
      </Box>
      <Box className={classes.contentContainer}>
        <Box className={classes.wideComponent}>
          <GuardRailTable page={page} onPageChange={setPage} data={metricsData} />
        </Box>
        <Box className={classes.sideBySide}>
          <Box className={classes.halfWidth}>
            <SonarMetrics />
          </Box>
          <Box className={classes.halfWidth}>
            <MutationMetrics />
          </Box>
        </Box>
      </Box>
      {ownerName && <div>Selected Owner: {ownerName}</div>}
    </Box>
  );
};
