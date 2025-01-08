import React from 'react';
import { Grid } from '@material-ui/core';
import {
  InfoCard,
  Header,
  Page,
  Content,
  ContentHeader,
  SupportButton,
} from '@backstage/core-components';
import { CatalogReport } from '../catalog/components';

// title="Export CSV file"
export const ReportPage = () => {
  return (
    <Page themeId="tool">
      <Header title="Reports" subtitle="Reports available in Moonlight" />
      <Content>
        <ContentHeader title="">
          <SupportButton />
        </ContentHeader>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <InfoCard title="Generate your report">
              <CatalogReport />
            </InfoCard>
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
