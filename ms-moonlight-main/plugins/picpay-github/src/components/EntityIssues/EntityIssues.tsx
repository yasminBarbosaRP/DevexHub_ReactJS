import React, { useCallback, useEffect, useState } from 'react';
import { Typography, Grid, Button } from '@material-ui/core';
import {
  InfoCard,
  Progress,
} from '@backstage/core-components';
import LinkIcon from '@material-ui/icons/Link';
import { githubApiRef, GithubIssue } from '../../api';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import {
  useEntity,
} from '@backstage/plugin-catalog-react';
import { useStyles } from '../styles';
import Chip from '@material-ui/core/Chip';
import { Alert } from '@material-ui/lab';

const sourceLocationRegex = /PicPay\/(.*?)\/tree/;

export const EntityIssues = () => {
  const githubApi = useApi(githubApiRef);
  const alertApi = useApi(alertApiRef);
  const classes = useStyles();
  const { entity } = useEntity();

  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | undefined>(undefined);
  const [issues, setIssues] = useState<GithubIssue[]>([]);

  const getOrgAndRepository = useCallback(() => {
    const annotations = entity.metadata.annotations ?? {};
    for (const key of [
      'backstage.io/source-location',
      'backstage.io/managed-by-location',
    ]) {
      if (annotations[key]) {
        const match = sourceLocationRegex.exec(annotations[key]);
        if (match && match[1]) {
          return ['PicPay', match[1]];
        }
      }
    }

    if (annotations['github.com/project-slug']) {
      const [org, repo] = annotations['github.com/project-slug'].split('/');

      if (org && repo) {
        return [org, repo];
      }
    }

    return [undefined, undefined];
  }, [entity]);

  useEffect(() => {
    const [_org, repo] = getOrgAndRepository();
    githubApi.getIssues(repo ?? entity.metadata.name)
      .then((i: (GithubIssue[] | { error: string })) => {
        if ('error' in i) throw i.error;
        setIssues(i.filter((e: GithubIssue) => e.state === 'open' && e.user?.login?.includes('[bot]')));
      }).catch((err: any) => {
        const errMsg = `Error fetching issues: ${err.message}`;
        alertApi.post({
          message: errMsg,
          severity: 'error',
        });
        setError(errMsg)
      }).finally(() => setLoading(false))

  }, [entity, githubApi, alertApi, getOrgAndRepository]);

  const isError = !loading && error;
  const showIssues = !loading && !error && issues.length > 0;
  const noIssues = !loading && !error && issues.length === 0;

  return (
    <Grid container data-testid="entity-issues" direction="column">
      <Grid item>
        <InfoCard title={
          <>
            Issues Pending {!loading && <Chip key={issues.length} size="small" label={issues.length} />}
          </>
        }>
          {loading && <Progress data-testid="progress" />}
          {isError && (
            <Alert severity='error'>{error}</Alert>
          )}
          {showIssues && issues.map((e, i) => (
            <Grid item md={12} key={`issue${i}`} style={{ marginBottom: '2em' }}>
              <Typography variant="h1" className={classes.label}>
                <Grid container>
                  <Grid item md={10}>
                    <Chip key={i + 1} size="small" label={i + 1} /> {e.title}
                  </Grid>
                  <Grid item md={2} container justifyContent='flex-end'>
                    <Button
                      data-testid="see-more"
                      variant="text"
                      color="primary"
                      startIcon={<LinkIcon />}
                      href={e.html_url}
                      target="_blank"
                    >Open Issue</Button>
                  </Grid>
                </Grid>
              </Typography>
              {e.labels.map(l => (
                <Chip key={l.name} size="small" label={l.name} />
              ))}
              <Chip className={classes.issuer} key={`issuer:${e.user.login}`} size="small" label={`issuer:${e.user.login}`} />
              {e.body && (
                <p><i>{e.body?.split('<br/>')[0].split('\n')[0].slice(0, 150)}...</i></p>
              )}
            </Grid>
          ))}
          {noIssues && <>This {entity.kind} has no Issues pending.</>}
        </InfoCard>
      </Grid>
    </Grid>
  )
};
