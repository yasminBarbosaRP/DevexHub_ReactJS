import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
} from '@material-ui/core';
import CloseIcon from '@material-ui/icons/Close';
import { NpsForm } from '../form';
import { useStyles } from './styles';
import { useLocation } from 'react-use';
import { useApi } from '@backstage/core-plugin-api';
import { NpsApiRef, NpsSurvey, SurveyAnswer } from '../../api';

export const NpsDialog = () => {
  const classes = useStyles();
  const api = useApi(NpsApiRef);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [surveyList, setSurveyList] = useState<Array<NpsSurvey>>([]);
  const [survey, setSurvey] = useState<NpsSurvey | undefined>();

  const [previousPath, setPreviousPath] = useState<string | undefined>('');
  const handleClose = () => {
    setSurveyList([]);
    setOpen(false);
  };

  useEffect(() => {
    api.getSurveyList().then(res => {
      if (!res.data) return;
      setSurveyList(res.data);
    });
  }, [api]);

  useEffect(() => {
    if (previousPath !== location.pathname) {
      const _survey = surveyList.find(obj => {
        return (
          previousPath?.includes(obj.route) ||
          obj.route === 'ms-moonlight-general'
        );
      });

      if (
        (_survey && !location.pathname?.includes(_survey.route)) ||
        _survey?.route === 'ms-moonlight-general'
      ) {
        setOpen(true);
        setSurvey(_survey);
      }

      setPreviousPath(location.pathname);
    }
  }, [location, surveyList, previousPath]);

  const handleForm = (res: SurveyAnswer) => {
    setSurveyList(
      surveyList.filter((item: NpsSurvey) => item.id !== res.survey_id),
    );
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      aria-labelledby="nps-dialog-title"
      aria-describedby="nps-dialog-description"
      data-testid="nps-dialog"
    >
      {survey && (
        <>
          <div className={classes.header}>
            <DialogTitle className={classes.title}>{survey.title}</DialogTitle>
            <IconButton
              aria-label="close"
              className={classes.closeButton}
              onClick={handleClose}
            >
              <CloseIcon />
            </IconButton>
          </div>
          <Divider />
          <DialogContent className={classes.content}>
            <NpsForm
              handleClose={handleClose}
              handleForm={handleForm}
              survey={survey}
            />
          </DialogContent>
        </>
      )}
    </Dialog>
  );
};
