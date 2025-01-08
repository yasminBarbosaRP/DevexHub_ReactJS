import { Progress } from '@backstage/core-components';
import {
  Button,
  FormControl,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { useState } from 'react';
import { useStyles } from './styles';
import { ReviewerStatus, StatusPage } from '../../../../models';
import { Sanctuary2ApiRef } from '../../../../api';
import { useApi } from '@backstage/core-plugin-api';

interface Props {
  actionId: string;
  email: string;
  handleConfirm: Function;
}

export const Approver = (props: Props) => {
  const { actionId, email, handleConfirm } = props;
  const classes = useStyles();
  const [value, setValue] = useState('');
  const api = useApi(Sanctuary2ApiRef);
  const [status, setStatus] = useState(StatusPage.success);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setValue((event.target as HTMLInputElement).value);
  };

  return status === StatusPage.loading ? (
    <Progress className={classes.progress} />
  ) : (
    <div className={classes.content}>
      {status === StatusPage.error && (
        <Alert
          data-testid="alert-error"
          className={classes.alert}
          severity="error"
        >
          <strong>ERROR: </strong>
          {errorMessage || 'An unexpected problem occurred.'}
        </Alert>
      )}
      <Alert className={classes.alert} severity="warning">
        <strong>Pending Approval: </strong>
        <br />
        There is a pending request to delete this project.
        <h4>We need your approval to proceed with the flow.</h4>
        <div className={classes.confirm}>
          <FormControl component="fieldset">
            <RadioGroup
              className={classes.radioGroup}
              aria-label="approve"
              name="approve"
              value={value}
              onChange={handleChange}
            >
              <FormControlLabel
                data-testid="radio-yes"
                value="yes"
                control={<Radio />}
                label="I agree"
              />
              <FormControlLabel
                data-testid="radio-no"
                value="no"
                control={<Radio />}
                label="I do not agree"
              />
            </RadioGroup>
          </FormControl>
          <Button
            data-testid="btn-confirm"
            variant="outlined"
            color="secondary"
            disabled={!value}
            onClick={() => {
              setStatus(StatusPage.loading);
              api
                .postApprover({
                  component_id: actionId,
                  reviewer: email,
                  review_status:
                    value === 'yes'
                      ? ReviewerStatus.APPROVED
                      : ReviewerStatus.REJECTED,
                })
                .then(res => {
                  if (res.error) {
                    setStatus(StatusPage.error);
                    setErrorMessage(res.message);
                  } else {
                    handleConfirm(res);
                    setStatus(StatusPage.success);
                  }
                })
                .catch(res => {
                  setStatus(StatusPage.error);
                  if (res.error) {
                    setErrorMessage(res.message);
                  }
                });
            }}
          >
            {status === StatusPage.error ? 'Try Again' : 'Confirm'}
          </Button>
        </div>
      </Alert>
    </div>
  );
};
