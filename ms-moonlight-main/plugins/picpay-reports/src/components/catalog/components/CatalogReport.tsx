import React from 'react';
import { Button, Grid } from '@material-ui/core';
import { CatalogReportApiRef } from '../../../catalog';
import { useApi } from '@backstage/core-plugin-api';
import { parseCatalogComponent } from './parse';
import { CatalogComponent } from './types';
import moment from 'moment';
import { useStyles } from './styles';
import { exportToCsv } from '@internal/plugin-picpay-commons';

export function CatalogReport() {
  const classes = useStyles();
  const api = useApi(CatalogReportApiRef);

  const report = async () => {
    const result = await api
      .getCatalogComponent()
      .then(res => {
        return res;
      })
      .catch(e => {
        throw new Error(e);
      });

    const catalogComponent: CatalogComponent[] = parseCatalogComponent(result);
    const fileName = `catalog-component-${moment().format('DD-MM-YYYY')}`;
    exportToCsv(fileName, catalogComponent);
  };

  return (
    <Grid container>
      <Grid item md={3} xs={12} className={classes.columns}>
        <h3>Catalog Components</h3>
      </Grid>
      <Grid item md={7} xs={12} className={classes.columns}>
        Click the button to generate and export CSV Catalog Components, in this
        report you can see: Microservice name, Description, Owner and Lifecycle
        of the all Components in Moonlight.
      </Grid>
      <Grid
        item
        md={2}
        xs={12}
        className={`${classes.columns} ${classes.button}`}
      >
        <Button
          data-report="catalog-component-report"
          onClick={report}
          variant="contained"
          color="primary"
        >
          Export CSV
        </Button>
      </Grid>
    </Grid>
  );
}
