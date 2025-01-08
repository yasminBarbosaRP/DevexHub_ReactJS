import React from 'react';
import { Content, Page, Header } from '@backstage/core-components';
import { QuickAccess } from '../QuickAccess';
import { ScoreTestCertified } from '../WidgetTestCertified';
import { Grid } from '@material-ui/core';
import { Header as HeaderContent } from '../Header';
import { Features } from '../Features';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { PicpayMetrics } from '@internal/plugin-picpay-metrics';

export const HomePage: any = () => {
  const flags = useHoustonContext();

  return (
    <Page themeId="home">
      <Header title="Home" pageTitleOverride="Home" />
      <Content>
        <Grid container spacing={0}>
          <Grid item xs={12}>
            <HeaderContent myTeams={flags?.showNewHome ?? false} />
          </Grid>
          <Grid item xs={12} style={{ marginTop: '16px' }}>
            <h1 style={{ padding: '10px 0px 0', marginBottom: '-1px' }}>Your Organization Metrics</h1>
          </Grid>
          <Grid
            item
            xs={12}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'start',
              gap: '1px',
              marginTop: '16px',
            }}
          >
            <Grid container>
              {flags?.show_score_testcertified && (
                <Grid item xs={12} sm={12} md={2} style={{
                  padding: '0 16px',
                  height: '300px',
                }}>
                  <ScoreTestCertified />
                </Grid>
              )}
              <Grid
                item
                xs={12}
                sm={flags?.show_score_testcertified ? 6 : 12}
                md={flags?.show_score_testcertified ? 10 : 12}
                style={{
                  padding: '0 16px',
                  height: '300px',
                }}
              >
                <PicpayMetrics source="HOME_PAGE" />
              </Grid>
            </Grid>
          </Grid>
          <Grid item xs={12} style={{ marginTop: '150px' }}>
            <Features />
          </Grid>
          <Grid item xs={12} style={{ marginTop: '20px' }}>
            <QuickAccess />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};