import React from 'react';
import { HorizontalScrollGrid } from '@backstage/core-components';
import {
  Card,
  CardContent,
  CardMedia,
  Typography,
  Link,
  Grid,
} from '@material-ui/core';
import GrafanaIcon from './assets/grafana.svg';
import MetabaseIcon from './assets/metabase.svg';
import OpenSearchIcon from './assets/opensearch.svg';
import JaegerIcon from './assets/jaeger.svg';
import OneIDICon from './assets/OneIDIcon.svg';
import { useStyles } from './styles';

interface CardItems {
  label: string;
  link: string;
  icon: string;
}

const cardItems: CardItems[] = [
  {
    label: 'Grafana Infra',
    link: 'https://grafana.observability.ppay.me/',
    icon: GrafanaIcon,
  },
  {
    label: 'Sunlight Grafana Prod',
    link: 'https://grafana-prod-o11y.observability.ppay.me',
    icon: GrafanaIcon,
  },
  {
    label: 'Sunlight Grafana QA',
    link: 'https://grafana-qa-o11y.observability.ppay.me',
    icon: GrafanaIcon,
  },
  {
    label: 'Sunlight OpenSearch Prod',
    link: 'https://opensearch.observability.ppay.me/_dashboards',
    icon: OpenSearchIcon,
  },
  {
    label: 'Sunlight OpenSearch QA',
    link: 'https://o11y-logs-qa.observability.ppay.me/_dashboards/app/home/',
    icon: OpenSearchIcon,
  },
  {
    label: 'Sunlight Jaeger Prod',
    link: 'https://jaeger.observability.ppay.me/search',
    icon: JaegerIcon,
  },
  {
    label: 'Sunlight Jaeger QA',
    link: 'https://jaeger-qa.observability.ppay.me/search',
    icon: JaegerIcon,
  },
  {
    label: 'Metabase Prod',
    link: 'https://metabase.limbo.work/',
    icon: MetabaseIcon,
  },
  {
    label: 'Metabase QA',
    link: 'https://metabase.ms.qa.limbo.work/',
    icon: MetabaseIcon,
  },
  {
    label: 'OneID',
    link: 'https://picpay.identitynow.com/ui/d/dashboard',
    icon: OneIDICon,
  },
];

export const QuickAccess = () => {
  const classes = useStyles();

  const sanitizeName = (label: string) =>
    `${label}`.replaceAll(' ', '_').toLowerCase();
  const linkKey = (label: string) => `link-${sanitizeName(label)}`;
  const cardKey = (label: string) => `card-${sanitizeName(label)}`;

  return (
    <div>
      <h1>Quick Access Links</h1>
      <Grid container>
        <Grid item className={classes.carousel}>
          <HorizontalScrollGrid>
            {cardItems.map(item => (
              <Link
                href={item.link}
                target="_blank"
                underline="none"
                key={linkKey(item.label)}
              >
                <Card key={cardKey(item.label)} className={classes.card}>
                  <CardContent className={classes.cardContent}>
                    <CardMedia>
                      <img
                        src={item.icon}
                        alt={item.label}
                        className={classes.icon}
                      />
                    </CardMedia>
                    <Typography className={classes.label}>
                      {item.label}
                    </Typography>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </HorizontalScrollGrid>
        </Grid>
      </Grid>
    </div>
  );
};
