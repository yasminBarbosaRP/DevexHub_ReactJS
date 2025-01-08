import React, { useState } from 'react';
import {
  TextField,
  Button,
  Grid,
  Box,
  Typography,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import {
  Progress,
} from '@backstage/core-components';
import { useApi, alertApiRef, errorApiRef } from '@backstage/core-plugin-api';
import { useEntity } from '@backstage/plugin-catalog-react';
import { refreshStateApiRef } from '@internal/plugin-picpay-entity-refresh-status';
import { useStyles } from './styles';
import { ManageTemplateVersionApiRef } from '../../api';

export const ManagerTemplateVersion = () => {
  const classes = useStyles();
  const { entity } = useEntity();
  const [loading, setLoading] = useState(false);
  const [hashCommit, setHashCommit] = useState<string>('');
  const [error, setError] = useState<string>('');
  const api = useApi(ManageTemplateVersionApiRef);
  const refreshState = useApi(refreshStateApiRef);
  const errorApi = useApi(errorApiRef);
  const alertApi = useApi(alertApiRef);

  let branch = 'Main';
  if (entity.metadata.name.toLocaleLowerCase().endsWith('-qa')) {
    branch = 'Qa';
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setHashCommit(event.target.value);
  };

  const forceRefresh = async (name: string, kind: string, namespace: string, ttl: number) => {
    await refreshState
      .forceRefresh(
        name,
        kind,
        namespace,
        ttl
      );
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    setLoading(true);
    event.preventDefault();

    const project = entity.metadata.annotations?.['github.com/project-slug'];
    if (!project) {
      setError(`metadata.annotation 'github.com/project-slug' not found!`);
      setLoading(false);
      return;
    }
    api.update({
      hash: hashCommit,
      name: entity.metadata.name,
      repository: project?.replace("PicPay/", "") ?? '',
      branch: branch.toLowerCase(),
    }).then(() => {
      setLoading(false);
      setHashCommit('');

      alertApi.post({
        message: 'Template version updated successfully',
        severity: 'success',
        display: 'transient',
      });

      forceRefresh(
        entity.metadata.name,
        entity.kind.toLowerCase(),
        entity.metadata.namespace ?? 'default',
        -432_000
      );
    }).catch((e: any) => {
      setLoading(false);
      setError(e.statusText);
      errorApi.post(e);
    });
  };

  if (loading) {
    return <Progress />;
  }

  return (
    <>
      {
        loading ? (
          <Progress />
        ) : (
          <form className={classes.formRoot} data-testid="test-form" id="managerTemplateVersion" onSubmit={handleSubmit}>
            {error && <Alert variant="filled" severity="error">{error}</Alert>}
            <Grid item xs={12} md={12}>
              <Grid className={classes.card} item xs={12} md={6}>

                <Box className={classes.cardHeader}>
                  <Typography variant="h4">Manage {branch} Template Version</Typography>
                </Box>

                <Box className={classes.cardContent}>
                  <TextField
                    data-testid="test-hash-commit"
                    id="BranchHashCommit"
                    label={`${branch.toUpperCase()} Branch SHA Commit `}
                    variant="outlined"
                    type="text"
                    placeholder='Insert the commit hash'
                    value={hashCommit}
                    onChange={handleChange}
                    fullWidth
                  />
                </Box>

                <Box className={classes.cardContent}>
                  <Button
                    data-testid="test-button-submit"
                    variant="contained"
                    color="primary"
                    type="submit"
                    disabled={loading}
                  >
                    Change {branch} Template Version
                  </Button>
                </Box>

              </Grid>
            </Grid>
          </form>
        )
      }
    </>
  )
};