import React, { useState } from 'react';
import {
  Button,
  CircularProgress,
  FormHelperText,
  TextField,
  Typography,
} from '@material-ui/core';
import { Alert } from '@material-ui/lab';
import { Stars } from '../stars';
import { useStyles } from './styles';
import { Props, Status } from './interfaces';
import { useApi } from '@backstage/core-plugin-api';
import { NpsApiRef } from '../../api';

const ratingList = [1, 2, 3, 4, 5];

export const NpsForm = (props: Props) => {
  const classes = useStyles();
  const api = useApi(NpsApiRef);
  const { handleClose, handleForm } = props;
  const [selectedRating, setSelectedRating] = useState(-1);
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState<Status>(Status.pending);

  const handleTextField = (value: string) => {
    if (value.length > 255) return;
    setComment(value);
  };

  const postpone = () => {
    api.postponeSurveyAnswer({ survey: props.survey.id }).then(res => {
      handleForm(res);
    });
  };

  const submit = () => {
    api
      .postSurveyAnswer({
        survey_id: props.survey.id,
        rating: selectedRating,
        message: comment,
      })
      .then(res => {
        handleForm(res);
        setStatus(Status.success);
      })
      .catch(() => {
        setStatus(Status.error);
      });
  };

  return (
    <>
      {status === Status.success ? (
        <Typography
          data-testid="success-message"
          className={classes.successMessage}
        >
          Thank you for your evaluation. Your opinion is very important for us
          to build a better platform. 😉💚
        </Typography>
      ) : (
        <form id="form-nps">
          {status === Status.error && (
            <Alert variant="filled" severity="error">
              An unexpected error occurred.
            </Alert>
          )}
          <Typography variant="h6" className={classes.question}>
            {props.survey.description || 'How do you evaluate your experience?'}
          </Typography>
          <Stars
            ratingList={ratingList}
            selectedRating={selectedRating}
            handleRating={setSelectedRating}
            disabled={status === Status.loading}
          />
          {selectedRating >= 0 && (
            <>
              <TextField
                data-testid="form-input"
                className={classes.textField}
                label="Leave your comment"
                placeholder="Give us feedback"
                multiline
                variant="filled"
                value={comment}
                disabled={status === Status.loading}
                onChange={e => {
                  handleTextField(e.currentTarget.value);
                }}
              />
              <FormHelperText className={classes.formHelper}>
                {comment.length}/255
              </FormHelperText>
            </>
          )}

          <div className={classes.actions}>
            <Button
              data-testid="form-postpone"
              className={classes.button}
              onClick={() => {
                handleClose();
                postpone();
              }}
              color="primary"
              disabled={status === Status.loading}
            >
              Not now
            </Button>
            <Button
              data-testid="form-send"
              className={classes.button}
              onClick={submit}
              color="primary"
              variant="contained"
              disabled={selectedRating < 0 || status === Status.loading}
            >
              {status === Status.loading && (
                <CircularProgress className={classes.progress} size={16} />
              )}
              {status !== Status.error ? 'Send' : 'Try again'}
            </Button>
          </div>
        </form>
      )}
    </>
  );
};
