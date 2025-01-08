import { HorizontalScrollGrid } from '@backstage/core-components';
import {
  Grid,
  Card,
  CardContent,
  CardMedia,
  Link,
  useTheme,
} from '@material-ui/core';
import React from 'react';
import { useStyles } from './styles';
import { CatalogIcon } from './assets/CatalogIcon';
import { TemplatesIcon } from './assets/TemplateIcon';
import { ReportsIcon } from './assets/ReportsIcon';
import { ApisIcon } from './assets/ApisIcon';
import { HistoryIcon } from './assets/HistoryIcon';
import { FavoritesIcon } from './assets/FavoritesIcon';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { TechDocsIcon } from './assets/TechDocsIcon';

const FeatureItems = [
  {
    label: 'Catalog',
    link: '/catalog',
    renderIcon: (fill: string) => <CatalogIcon fill={fill} />,
    description:
      'Check our detailed component catalog with all kinds of microservices, APIs, resources and more.',
  },
  {
    label: 'Favorites',
    link: '/catalog?filters%5Bkind%5D=component&filters%5Buser%5D=starred',
    renderIcon: (fill: string) => <FavoritesIcon fill={fill} />,
    description:
      'Add stars to your favorite components, like docs and APIs to find them faster.',
  },
  {
    label: 'Templates',
    link: '/create',
    renderIcon: (fill: string) => <TemplatesIcon fill={fill} />,
    description:
      'Create new components, from microservices to repositories, in a few clicks from our available templates.',
  },
  {
    label: 'TechDocs',
    link: '/docs',
    renderIcon: (fill: string) => <TechDocsIcon fill={fill} />,
    description:
      "Access our technical documentation from components using Moonlight's pipeline.",
  },
  {
    label: 'History',
    link: '/history',
    renderIcon: (fill: string) => <HistoryIcon fill={fill} />,
    description:
      'Find our logs listing which records the deletion of tasks or renaming services, through component management.',
  },
  {
    label: 'APIs',
    link: '/api-docs',
    renderIcon: (fill: string) => <ApisIcon fill={fill} />,
    description:
      "Check our API's detailed catalog, which contains their respective swagger documentation.",
  },
  {
    label: 'Reports',
    link: '/reports',
    renderIcon: (fill: string) => <ReportsIcon fill={fill} />,
    description:
      "Export our catalog into a complete .csv file containing the microservice's names, descriptions and more.",
  },
];

export const Features = () => {
  const classes = useStyles();
  const flags = useHoustonContext();
  const theme = useTheme();

  return flags?.showNewHome ? (
    <div>
      <h1>Check all the things you can do</h1>
      <Grid container>
        <Grid item className={classes.carousel}>
          <HorizontalScrollGrid>
            {FeatureItems.map((item) => (
              <Link
                href={item.link}
                underline="none"
                key={`card-${item.label}`}
              >
                <Card key={`internal-cards-${item.label}`} className={classes.card}>
                  <CardContent className={classes.cardContent}>
                    <CardMedia className={classes.cardMedia}>
                      {item.renderIcon(theme.palette.text.primary)}
                      <h1 className={classes.label}>{item.label}</h1>
                    </CardMedia>
                    {item.description}
                  </CardContent>
                </Card>
              </Link>
            ))}
          </HorizontalScrollGrid>
        </Grid>
      </Grid>
    </div>
  ) : (
    <></>
  );
};
