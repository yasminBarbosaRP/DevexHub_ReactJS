import React from 'react';
import {
  usePermission,
  RequirePermissionProps,
} from '@backstage/plugin-permission-react';
import { isResourcePermission } from '@backstage/plugin-permission-common';
import { Box, Typography, makeStyles } from '@material-ui/core';
import { MicDrop } from './MicDrop';
import { Link } from '@backstage/core-components';
import { useNavigate } from 'react-router';

const useStyles = makeStyles(theme => ({
  container: {
    display: 'flex',
    padding: '64px',
  },
  message: {
    maxWidth: '33%',
    marginTop: '16px',
    textAlign: 'start',
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  subtitle: {
    color: theme.palette.textSubtle,
  },
  title: {
    textAlign: 'start',
  },
}));

// @TODO: alterar a chamada de packages/app/src/components/customPermissionPage/NoPermissionImportPage.tsx por este componente
export const CustomRequirePermission = (
  props: RequirePermissionProps,
): JSX.Element | null => {
  const navigate = useNavigate();
  const classes = useStyles();

  const { permission, resourceRef } = props;
  const permissionResult = usePermission(
    isResourcePermission(permission) ? { permission, resourceRef } : { permission },
  );

  if (permissionResult.loading) {
    return null;
  } else if (permissionResult.allowed) {
    return <>{props.children}</>;
  }

  if (props.errorPage) {
    return <>{props.errorPage}</>;
  }

  return (
    <Box className={classes.container}>
      <Box className={classes.message}>
        <Typography
          data-testid="error"
          variant="body1"
          className={classes.subtitle}
        >
          ERROR: 401 Unauthorized
        </Typography>
        <Typography className={classes.title} variant="h3" align="center">
          You don't have permission to access this page
        </Typography>
        <Typography variant="h6">
          <Link to="#" data-testid="go-back-link" onClick={() => navigate(-1)}>
            Go back
          </Link>
          ... or please contact us if you think this is a bug.
        </Typography>
      </Box>
      <MicDrop />
    </Box>
  );
};
