import React from 'react';
import { Grid } from '@material-ui/core';
import { Header, Page, Content } from '@backstage/core-components';
import { CustomToolExplorerContent } from '../CustomToolExplorerContent';

export const ToolsComponent = () => {
  return (
    <Page themeId="tool">
      <Header
        title="Explore the Moonlight Tools"
        subtitle="Discover tools available at PicPay"
      />
      <Content>
        <Grid container spacing={3} direction="column">
          <Grid item>
            <CustomToolExplorerContent title="Available Tools" />
          </Grid>
        </Grid>
      </Content>
    </Page>
  );
};
