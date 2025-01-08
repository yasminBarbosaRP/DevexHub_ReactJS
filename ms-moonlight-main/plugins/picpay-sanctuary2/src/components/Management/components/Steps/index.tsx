import React, { ReactNode, useEffect, useState } from 'react';
import Stepper from '@material-ui/core/Stepper';
import Step from '@material-ui/core/Step';
import StepLabel from '@material-ui/core/StepLabel';
import Typography from '@material-ui/core/Typography';
import CachedIcon from '@material-ui/icons/Cached';
import moment from 'moment';

import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
} from '@material-ui/core';
import {
  StatusResponse,
  StepEvent,
  StepStatus,
  Step as StepStatusResponse,
} from '../../../../models';
import { useStyles } from './styles';
import ExpandMoreIcon from '@material-ui/icons/ExpandMore';

interface Props {
  data: StatusResponse | null;
  refresh: Function;
}

export const Steps = (props: Props) => {
  const { data, refresh } = props;
  const classes = useStyles();
  const [list, setList] = useState<Array<StepStatusResponse>>([]);
  const [expandedAccordion, setExpandedAccordion] = useState(true);

  useEffect(() => {
    const order = [StepStatus.DONE, StepStatus.PENDING];

    setList(
      (data?.steps ?? []).sort(
        (x, y) => order.indexOf(x.status) - order.indexOf(y.status),
      ),
    );
  }, [data]);

  return (
    <Accordion
      data-testid="steps-component"
      expanded={expandedAccordion}
      onChange={() => {
        setExpandedAccordion(!expandedAccordion);
      }}
      className={classes.steps}
    >
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel1a-content"
        id="panel1a-header"
      >
        <div className={classes.contentTitle}>
          <h1 className={classes.title}>Steps</h1>
          <Button
            data-testid="refresh"
            variant="outlined"
            color="primary"
            onClick={() => {
              refresh();
            }}
            startIcon={<CachedIcon />}
          >
            Refresh
          </Button>
        </div>
      </AccordionSummary>
      <AccordionDetails>
        <Stepper
          className={classes.stepper}
          activeStep={-1}
          orientation="vertical"
        >
          {list.map(el => {
            const stepProps: { completed?: boolean } = {};
            const labelProps: { optional?: ReactNode; error?: boolean } = {};
            const lastEvent: StepEvent[] = (el.events ?? []).slice(-1);

            const eventClass: { [name: string]: string } = {
              info: classes.stepMessage,
              warning: classes.stepMessageWarning,
              error: classes.stepMessageError,
            };

            labelProps.optional = (
              <Typography variant="caption" color="primary">
                {el.events &&
                  el.events.map((event, i) => {
                    return (
                      <span
                        className={eventClass[event.type]}
                        key={`step-message-${i}`}
                      >
                        [{moment(event.date).format('DD/MM/YYYY HH:mm:ss')}]{' '}
                        <strong>{event.message}</strong>
                      </span>
                    );
                  })}
              </Typography>
            );

            if (lastEvent.length && lastEvent[0].type === 'error') {
              labelProps.error = true;
            }

            if (el.status === StepStatus.DONE) {
              stepProps.completed = true;
            }

            return (
              <Step key={el.type} {...stepProps}>
                <StepLabel {...labelProps}>{el.title || el.type}</StepLabel>
              </Step>
            );
          })}
        </Stepper>
      </AccordionDetails>
    </Accordion>
  );
};
