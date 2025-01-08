import {
  Box,
  Card,
  CardActions,
  CardContent,
  CardMedia,
  Chip,
  makeStyles,
  Theme,
  Typography,
} from '@material-ui/core';
import { ItemCardHeader, LinkButton } from '@backstage/core-components';
import classNames from 'classnames';
import React from 'react';
import { CategoryTool } from '@internal/plugin-picpay-tools-backend';

const useStyles = makeStyles<Theme>(theme => ({
  cardHeader: {
    position: 'relative',
  },
  title: {
    backgroundImage: ({ backgroundImage }: any) => backgroundImage,
  },
  media: {
    height: 128,
  },
  mediaContain: {
    backgroundSize: 'contain',
  },
  lifecycle: {
    lineHeight: '0.8em',
    color: theme.palette.common.white,
  },
  ga: {
    backgroundColor: theme.palette.status.ok,
  },
  alpha: {
    backgroundColor: theme.palette.status.error,
  },
  beta: {
    backgroundColor: theme.palette.status.warning,
  },
}));

type CustomToolCardProps = {
  card: CategoryTool;
};

export const CustomToolCard = ({ card }: CustomToolCardProps) => {
  const classes = useStyles();

  const {
    id,
    title,
    description,
    productUrl,
    docsUrl,
    lifecycle,
    image,
    tags,
    typeInterface,
  } = card;

  return (
    <Card key={id}>
      <CardMedia image={image} title={title} className={classes.cardHeader}>
        <ItemCardHeader
          title={typeInterface}
          subtitle={title}
          classes={{ root: classes.title }}
        />
      </CardMedia>
      <CardContent>
        <Typography paragraph variant="h5">
          {lifecycle && lifecycle.toLocaleLowerCase('en-US') !== 'ga' && (
            <Chip
              size="small"
              label={lifecycle}
              className={classNames(
                classes.lifecycle,
                classes[lifecycle.toLocaleLowerCase('en-US')],
              )}
            />
          )}
        </Typography>
        <Typography>{description ?? 'Description missing'}</Typography>
        {tags && (
          <Box marginTop={2}>
            {tags.map(item => (
              <Chip size="small" key={item} label={item} />
            ))}
          </Box>
        )}
      </CardContent>
      <CardActions>
        {docsUrl && (
          <LinkButton color="primary" to={docsUrl}>
            Docs
          </LinkButton>
        )}
        {productUrl && (
          <LinkButton color="primary" to={productUrl}>
            Explore
          </LinkButton>
        )}
      </CardActions>
    </Card>
  );
};
