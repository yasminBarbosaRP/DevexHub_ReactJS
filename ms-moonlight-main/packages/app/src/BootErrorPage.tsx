import { ErrorPage } from '@backstage/core-components';
import { BootErrorPageProps } from '@backstage/core-plugin-api';
import { makeStyles } from '@material-ui/core/styles';
import Grid from '@material-ui/core/Grid';
import Typography from '@material-ui/core/Typography';
import React, { ReactNode } from 'react';
import { MemoryRouter, useInRouterContext } from 'react-router';
import { Button } from '@material-ui/core';

const useStyles = makeStyles(theme => ({
  container: {
    padding: theme.spacing(0, 8),
    color: theme.palette.textSubtle,
  },
  reload: {
    padding: theme.spacing(1, 2),
    color: theme.palette.textVerySubtle,
  },
}));

function OptionallyWrapInRouter({ children }: { children: ReactNode }) {
  if (useInRouterContext()) {
    return <>{children}</>;
  }
  return <MemoryRouter>{children}</MemoryRouter>;
}

export default ({ step, error }: BootErrorPageProps) => {
  const classes = useStyles();
  const [retryTime, setRetryTime] = React.useState(10);
  const [message, setMessage] = React.useState('');
  const [errorCode, setErrorCode] = React.useState('501');

  React.useEffect(() => {
    if (retryTime <= 0) {
      window.location.reload();
    }
  }, [retryTime]);

  React.useEffect(() => {
    const messages: string[] = [];

    switch (step) {
      case 'load-config':
        messages.push(
          'The configuration failed to load, someone should have a look at this error',
        );
        break;

      case 'load-chunk':
        messages.push(
          'Lazy loaded chunk failed to load, try to reload the page',
        );
        break;

      default:
        messages.push('Whoops, something went wrong on our servers');
        setErrorCode('500');
    }

    if (error?.message) {
      messages.push(error.message);
    }

    setMessage(`${messages.join(': ')}.`);

    const intervalId = setInterval(
      () => setRetryTime(value => (value > 0 ? value - 1 : 0)),
      1000,
    );
    return () => clearInterval(intervalId);
  }, [step, error.message, setMessage, setRetryTime, setErrorCode]);

  return (
    <OptionallyWrapInRouter>
      <ErrorPage status={errorCode} statusMessage={message} />

      <Grid container spacing={0} className={classes.container}>
        <Button
          variant="contained"
          color="primary"
          onClick={() => window.location.reload()}
        >
          Reload
        </Button>
        <Typography className={classes.reload}>
          Auto reload in {retryTime}s.
        </Typography>
      </Grid>
    </OptionallyWrapInRouter>
  );
};
