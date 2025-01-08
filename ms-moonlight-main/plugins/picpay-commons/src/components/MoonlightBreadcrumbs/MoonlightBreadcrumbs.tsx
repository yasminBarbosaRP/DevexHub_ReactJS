import React from 'react';
import {
  Breadcrumbs,
  Box,
  Typography,
  makeStyles,
} from '@material-ui/core';
import { EntityRefLink } from '@backstage/plugin-catalog-react';

const useStyles = makeStyles(() => ({
  textBreadcrumb: {
    fontSize: '1.0em',
  },
}));
interface BreadcrumbProps {
  active: string;
  links: {
    title: string;
    href: string;
  }[];
  inverse?: boolean;
  iconComponent?: React.ReactNode;
  separator?: string;
}

export const MoonlightBreadcrumbs: React.FC<BreadcrumbProps> = ({
  active, links, inverse, iconComponent, separator = ">"
}) => {
  const classes = useStyles();
  const nonActiveLinks = links.filter((link) => link.title !== active);
  const breadcrumbs = nonActiveLinks.map((link) => {
    return (
      <EntityRefLink
        className={classes.textBreadcrumb}
        underline='hover'
        key={link.title}
        entityRef={link.href}
        title={link.title}
      />
    );
  });

  return (
    breadcrumbs.length === 0 ? null : (
      <Box mt={0} mb={3}>
        <Breadcrumbs
          aria-label="breadcrumb"
          separator={separator}
          color="primaryText">
          {iconComponent}
          {inverse ? breadcrumbs.reverse() : breadcrumbs}
          <Typography
            className={classes.textBreadcrumb}
            key="active"
            color="textPrimary"
          >
            {active}
          </Typography>
        </Breadcrumbs>
      </Box>
    )
  );
};