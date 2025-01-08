import React, { useCallback, useState, useEffect } from 'react';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import { InfoCard } from '@backstage/core-components';
import { Grid, Tooltip } from '@material-ui/core';
import { ProgressStatus } from '../../../../models';
import { useStyles } from './styles';
import Replay from '@material-ui/icons/Replay';
import { Button } from '@material-ui/core';
import { DeleteQuestion } from '../DeleteQuestion';

interface Props {
  data: ProgressStatus | null;
  deletionSchedule?: Date | string;
  postRetry: Function;
  cancelDeletion: Function;
}

interface StepInterface {
  error: boolean;
  label: string;
}

export const Status = (props: Props) => {
  const { data, deletionSchedule, postRetry, cancelDeletion } = props;
  const classes = useStyles();
  const [activeStep, setActiveStep] = React.useState(0);
  const [steps, setSteps] = React.useState<Array<StepInterface>>([]);
  const [isError, setIsError] = useState(false);
  const [retryBusy, setRetryBusy] = useState(false);
  const [showCancel, setShowCancel] = useState(false);

  const retryClickHandler = useCallback(async () => {
    setRetryBusy(true);
    await postRetry();
    setRetryBusy(false);
  }, [postRetry, setRetryBusy]);

  const setCurrentStep = useCallback(() => {
    if (!data) return;

    if (data === ProgressStatus.ERROR) {
      setIsError(true);
    }

    switch (data) {
      case ProgressStatus.PENDING:
      case ProgressStatus.APPROVED:
        setActiveStep(1);
        break;

      case ProgressStatus.SUCCESS:
      case ProgressStatus.REJECTED:
      case ProgressStatus.ERROR:
        setActiveStep(2);
        break;

      default:
        setActiveStep(0);
    }
  }, [data]);

  useEffect(() => {
    const auxSteps = [
      { label: 'Waiting for approval', error: false },
      { label: 'In progress', error: false },
      { label: 'Finished', error: false },
    ];

    if (
      data &&
      [ProgressStatus.REJECTED, ProgressStatus.ERROR].includes(data)
    ) {
      delete auxSteps[1];
      auxSteps[auxSteps.length - 1].error = true;
      auxSteps[auxSteps.length - 1].label =
        data === ProgressStatus.REJECTED ? 'Rejected' : 'Error';
    }

    if (deletionSchedule) {
      auxSteps[0].label = 'Waiting for the date';
    }

    setSteps(auxSteps);
    setCurrentStep();
    setShowCancel(
      !!data &&
        [
          ProgressStatus.SCHEDULED,
          ProgressStatus.WAITING_FOR_APPROVAL,
          ProgressStatus.REJECTED,
        ].includes(data),
    );
  }, [data, deletionSchedule, setCurrentStep]);

  return (
    data && (
      <Grid data-testid="status-component" item xs={12} md={12}>
        <InfoCard>
          <Grid item xs={12} className={classes.grid}>
            <h1 className={classes.description}>Status</h1>

            {showCancel && (
              <DeleteQuestion
                className={classes.floatRight}
                handler={cancelDeletion}
              />
            )}

            <Tooltip title="Restart failed steps when error occurs">
              <span>
                <Button
                  data-testid="retry"
                  className={classes.floatRight}
                  disabled={!isError || retryBusy}
                  variant="outlined"
                  color="primary"
                  onClick={() => retryClickHandler()}
                  startIcon={<Replay />}
                  style={{ marginLeft: '8px' }}
                >
                  Retry
                </Button>
              </span>
            </Tooltip>
          </Grid>

          <Stepper activeStep={activeStep} className={classes.stepper}>
            {steps.map((el, i) => {
              const stepProps: { completed?: boolean } = {};
              const labelProps: {
                error?: boolean;
              } = {};

              labelProps.error = el.error;
              stepProps.completed =
                data === ProgressStatus.SUCCESS || i < activeStep;

              return (
                <Step key={`step-${el.label}`} {...stepProps}>
                  <StepLabel {...labelProps}>{el.label}</StepLabel>
                </Step>
              );
            })}
          </Stepper>
        </InfoCard>
      </Grid>
    )
  );
};
