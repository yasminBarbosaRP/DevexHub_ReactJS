import { Box, Typography, makeStyles } from '@material-ui/core';
import React from 'react';
import MicDropSvgUrl from './mic-drop.svg';
import { Link } from '@backstage/core-components';
import { useNavigate } from 'react-router';

const useStyles = makeStyles(() => ({
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

  title: {
    textAlign: 'start',
  },
}));

export const NoPermissionImportPage = () => {
  const navigate = useNavigate();
  const classes = useStyles();

  return (
    <Box className={classes.container}>
      <Box className={classes.message}>
        <Typography className={classes.title} variant="h3" align="center">
          You don't have permission to access this page
        </Typography>
        <Typography variant="h6">
          <Link to="#" data-testid="go-back-link" onClick={() => navigate(-1)}>
            Go back
          </Link>
        </Typography>
      </Box>
      <img src={MicDropSvgUrl} alt="Girl dropping mic from her hands" />
    </Box>
  );
};
