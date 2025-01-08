import React, { useEffect, useState } from 'react';
import { VisionCatalogScores } from './components/VisionCatalogScoresComponent';
import { VisionCatalogChecks } from './components/VisionCatalogChecksComponent';
import { Box, makeStyles } from '@material-ui/core';
import { useAsyncFn } from 'react-use';
import { useEntity } from '@backstage/plugin-catalog-react';
import { useApi } from '@backstage/core-plugin-api';
import { visionApiRef } from '../../api';
import { VisionChecks } from '@internal/plugin-picpay-vision-backend';
import Alert from '@material-ui/lab/Alert';

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '64px',
  },
  error: {
    textAlign: 'center',
    padding: '1rem',
  },
}));

export const VisionCatalogContent = () => {
  const classes = useStyles();

  const visionApi = useApi(visionApiRef);

  const { entity } = useEntity();

  const [refreshState, setRefreshState] =
    useState<VisionChecks['behavior']>('IDLE');

  const [visionCatalogResponse, fetchVisionCatalogContent] = useAsyncFn(
    async () => await visionApi.getVisionCatalogContent(entity.metadata.name),
    [visionApi]
  );

  const [___, fetchRefreshChecksForProject] = useAsyncFn(async () => {
    setRefreshState('REFRESHING');
    visionApi.refreshChecksForProject(entity.metadata.name);
  }, [visionApi]);

  const [_, fetchEnableToolForProject] = useAsyncFn(
    async (sourceId: string) => {
      await visionApi.enableToolForProject(entity.metadata.name, sourceId);
      await fetchRefreshChecksForProject();
    },
    [visionApi]
  );

  const [__, fetchDisableToolForProject] = useAsyncFn(
    async (sourceId: string) => {
      await visionApi.disableToolForProject(entity.metadata.name, sourceId);
      await fetchRefreshChecksForProject();
    },
    [visionApi]
  );

  useEffect(() => {
    if (visionCatalogResponse.value) {
      setRefreshState(visionCatalogResponse.value?.visionChecks.behavior);
    }
  }, [visionCatalogResponse]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (refreshState === 'REFRESHING') {
        fetchVisionCatalogContent();
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [refreshState, visionCatalogResponse, fetchVisionCatalogContent]);

  useEffect(() => {
    fetchVisionCatalogContent();
  }, [fetchVisionCatalogContent]);

  const error = visionCatalogResponse?.error as any;

  if (error) {
    return (
      <Alert severity="warning">
        {error?.response?.data?.message ||
          'There was an error loading Vision Metrics'}
      </Alert>
    );
  }

  if (visionCatalogResponse.value) {
    return (
      <Box className={classes.container}>
        <VisionCatalogScores
          visionOverviewResponse={visionCatalogResponse.value.visionOverview}
        />
        <VisionCatalogChecks
          isRefreshing={refreshState === 'REFRESHING'}
          visionChecksResponse={visionCatalogResponse.value.visionChecks}
          onEnableTool={(sourceId: string) =>
            fetchEnableToolForProject(sourceId)
          }
          onDisableTool={(sourceId: string) =>
            fetchDisableToolForProject(sourceId)
          }
          onRefresh={() => {
            fetchRefreshChecksForProject();
          }}
        />
      </Box>
    );
  }

  return null;
};
