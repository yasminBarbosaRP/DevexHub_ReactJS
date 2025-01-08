import { useNavigate } from 'react-router-dom';
import { Progress } from '@backstage/core-components';
import { useApi } from '@backstage/core-plugin-api';
import {
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Link,
  Radio,
  RadioGroup,
  TextField,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import React, { useState } from 'react';
import { Sanctuary2ApiRef } from '../../../../api';
import { StatusPage, Exceptions } from '../../../../models';
import { useStyles } from './styles';

interface Props {
  componentId: string;
  appName: string;
  componentKind: string;
  handleCancel: Function;
  handleConfirm: Function;
}

export const FormDelete = (props: Props) => {
  const { componentId, appName, componentKind, handleCancel, handleConfirm } = props;
  const classes = useStyles();
  const navigate = useNavigate();
  const api = useApi(Sanctuary2ApiRef);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState(StatusPage.success);
  const [errorMessage, setErrorMessage] = useState<string | undefined>();
  const [radio, setRadio] = useState('');

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRadio((event.target as HTMLInputElement).value);
  };

  const handleTextField = (value: string) => {
    if (value.length > 255) return;
    setComment(value);
  };

  const handleError = (data: string): void => {
    switch (data) {
      case Exceptions.COMPONENT_NOT_FOUND:
        navigate('/not_found');
        break;
      case Exceptions.GROUP_OWNER_NOT_FOUND:
        setErrorMessage('Group owner not found.');
        break;
      case Exceptions.REVIEWERS_NOT_FOUND:
        setErrorMessage('Reviewers not found.');
        break;
      case Exceptions.FAILED_GET_REVIEWERS:
        setErrorMessage('An error occurred while getting reviewers.');
        break;
      case Exceptions.FAILED_GET_OWNER:
        setErrorMessage('An error occurred while getting owner.');
        break;
      default:
        setErrorMessage(data);
    }
  };

  return status === StatusPage.loading ? (
    <Progress className={classes.progress} />
  ) : (
    <>
      <Alert className={classes.alert} severity="warning">
        <strong>ATTENTION: </strong>
        Do you want to delete the project? <br />
        <small>
          For more information,
          <Link
            href="/catalog/default/component/ms-fausthanos/docs/"
            target="_blank"
          >
            &nbsp;click here.
          </Link>
        </small>
      </Alert>

      <form
        noValidate
        autoComplete="off"
        className={classes.form}
        data-testid="form-delete"
      >
        <TextField
          data-testid="form-input"
          className={classes.textField}
          label="Leave your comment"
          placeholder=""
          multiline
          variant="filled"
          value={comment}
          onChange={e => {
            handleTextField(e.currentTarget.value);
          }}
        />
        <FormHelperText className={classes.formHelper}>
          {comment.length}/255
        </FormHelperText>

        <div>
          <p>
            Are you sure that there is no dependencies between another
            projects and this one?
          </p>
          <FormControl component="fieldset">
            <RadioGroup
              className={classes.radioGroup}
              aria-label="approve"
              name="approve"
              value={radio}
              onChange={handleChange}
            >
              <FormControlLabel
                data-testid="radio-no"
                value="no"
                control={<Radio />}
                label="No, I'm not sure."
              />
              <FormControlLabel
                data-testid="radio-yes"
                value="yes"
                control={<Radio />}
                label="Yes, I'm sure."
              />
            </RadioGroup>
          </FormControl>
        </div>
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

        <div className={classes.formActions}>
          <Button
            data-testid="btn-cancel"
            className={classes.formAction}
            variant="contained"
            color="primary"
            onClick={() => {
              setComment('');
              handleCancel();
            }}
          >
            Cancel
          </Button>
          <Button
            data-testid="btn-confirm"
            className={classes.formAction}
            color="primary"
            onClick={() => {
              setStatus(StatusPage.loading);
              api
                .postDelete({
                  component: {
                    id: componentId,
                    name: appName,
                    kind: componentKind,
                  },
                  reason: comment,
                })
                .then(res => {
                  if (res.error) {
                    setStatus(StatusPage.error);
                    handleError(typeof res.error === 'string' ? res.error : 'An unexpected error occurred');
                  } else {
                    handleConfirm(res);
                    setStatus(StatusPage.success);
                  }
                })
                .catch((error) => {
                  setStatus(StatusPage.error);
                  handleError(error.message);
                });
            }}
            disabled={comment.length <= 3 || radio !== 'yes'}
          >
            {status === StatusPage.error ? 'Try Again' : 'Confirm'}
          </Button>
        </div>
      </form>
    </>
  );
};
