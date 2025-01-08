import React, { useEffect, useState } from 'react';
import { EntityRefLinks, useEntity } from '@backstage/plugin-catalog-react';
import { InfoCard, InfoCardVariants } from '@backstage/core-components';
import { Box, Typography, makeStyles, Grid } from '@material-ui/core';
import Alert from '@material-ui/lab/Alert';
import MaterialLink from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import { useAnalytics } from '@backstage/core-plugin-api';
import { parseEntityRef } from '@backstage/catalog-model';

const useStyles = makeStyles(theme => ({
  value: {
    fontWeight: 'bold',
    overflow: 'hidden',
    lineHeight: '24px',
    wordBreak: 'break-word',
  },
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
}));

const ENVIRONMENTS = {
  hom: 'homolog',
  prd: 'production',
};

export const EntityEnvironment = (props: { variant?: InfoCardVariants }) => {
  const { entity } = useEntity();
  const classes = useStyles();
  const [clusters, setClusters] = useState<{ [k: string]: string | null }>({});
  const analytics = useAnalytics();

  useEffect(() => {
    const annotations = entity.metadata.annotations ?? {};

    const environments: { [k: string]: string } = {};

    if (annotations['moonlight.picpay/cluster-hom']) {
      environments[ENVIRONMENTS.hom] =
        annotations['moonlight.picpay/cluster-hom'];
    }

    if (annotations['moonlight.picpay/cluster-prd']) {
      environments[ENVIRONMENTS.prd] =
        annotations['moonlight.picpay/cluster-prd'];
    }

    setClusters(environments);
  }, [entity]);

  const handleClick = () => {
    analytics.captureEvent('click', 'No Environments found', {
      attributes: {
        to: 'https://picpay.atlassian.net/wiki/spaces/MOON/pages/2418344061/Como+configurar+o+servi+o',
      },
    });
  };

  const clusterKeys = Object.keys(clusters);

  return (
    <InfoCard variant={props.variant} title="Environments">
      <Grid container>
        {clusterKeys.length === 0 ? (
          <Box>
            <Alert severity="warning">
              No Environments Found for this Component!&nbsp;
              <MaterialLink
                component={RouterLink}
                to="https://picpay.atlassian.net/wiki/spaces/MOON/pages/2418344061/Como+configurar+o+servi+o#Configurando-defini%C3%A7%C3%A3o-do-cluster-da-aplica%C3%A7%C3%A3o"
                onClick={handleClick}
                target="_blank"
              >
                Click here to know how to change that.
              </MaterialLink>
            </Alert>
          </Box>
        ) : (
          clusterKeys.map(e => {
            const entityRefs = parseEntityRef(`${clusters[e]}`, {
              defaultKind: 'Resource',
              defaultNamespace: 'default',
            });

            return (
              clusters[e] && (
                <Grid key={`environment_${e}`} item>
                  <Typography variant="h2" className={classes.label}>
                    {e}
                  </Typography>
                  <EntityRefLinks
                    entityRefs={[entityRefs]}
                    defaultKind="Resource"
                  />
                </Grid>
              )
            );
          })
        )}
      </Grid>
    </InfoCard>
  );
};
