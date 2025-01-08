import React, { useState, useCallback } from 'react';
import Modal from '@material-ui/core/Modal';
import Button from '@material-ui/core/Button';
import { Typography } from '@material-ui/core';
import { useStyles } from './styles';
import processImage from './assets/1.svg';
import pipelineImage from './assets/2.svg';
import pullRequestImage from './assets/3.svg';
import deployQAImage from './assets/4.svg';
import pushMainImage from './assets/5.svg';
import deployProdImage from './assets/6.svg';

export const TutorialModal = (props: { open: boolean; toggle: () => void }) => {
  const [step, setStep] = useState<number>(1);
  const classes = useStyles();

  const textStep = [
    {
      title: 'Centralized CI/CD process',
      description:
        'Track your CI/CD process in 4 different pipelines and filter by type and status. Logs will be available for 20 minutes here on Moonlight. After that, you can access them from the Old Logs option.',
    },
    {
      title: 'Status of each pipeline',
      description:
        'Each task can display a status of running, completed successfully, completed with an error, or skipped. The status works as a kind of warning and must be evaluated according to the context.',
    },
    {
      title: 'Pull Request',
      description:
        'This process runs whenever a pull request is opened or when a new commit is added to the pull request branch. Access more details about the CI flow in the PR branch.',
    },
    {
      title: 'Deploy QA',
      description:
        'To start this pipeline, it is necessary to include the label "deploy-qa” and successfully generate a build. Access more details about the Deploy QA flow.',
    },
    {
      title: 'Push main',
      description:
        'Moonlight Pipeline uses the concept of Trunk-Based development. To start the main push pipeline, you need to merge your code into the main. Go to more details about the CI flow in the master branch.',
    },
    {
      title: 'Deploy Prod',
      description:
        'To start the deployment pipeline in production (prod), it is necessary to create a release. The code will be put into production which the end user person will have access. Access more details about the Deploy Prod flow.',
    },
  ];

  const handleNext = useCallback(() => {
    setStep(previousStep => previousStep + 1);
  }, []);

  const handlePrevious = useCallback(() => {
    setStep(previousStep => previousStep - 1);
  }, []);

  const stepImage = useCallback(() => {
    switch (step) {
      case 1:
        return processImage;
      case 2:
        return pipelineImage;
      case 3:
        return pullRequestImage;
      case 4:
        return deployQAImage;
      case 5:
        return pushMainImage;
      case 6:
        return deployProdImage;
      default:
        return processImage;
    }
  }, [step]);

  const body = (
    <div className={classes.paper}>
      <div>
        <Typography className={classes.step}>
          {step} of {textStep.length}
        </Typography>
      </div>
      <div>
        <Typography variant="h4" gutterBottom className={classes.title}>
          {textStep[step - 1].title}
        </Typography>
      </div>
      <img src={stepImage()} alt="tutorial" />
      <Typography variant="body1" gutterBottom>
        {textStep[step - 1].description}
      </Typography>
      <div className={classes.buttonContainer}>
        <Button
          variant="text"
          color="primary"
          onClick={props.toggle}
          className={classes.skipButton}
        >
          Skip Tutorial
        </Button>
        <div className={classes.rightButton}>
          <Button
            variant="contained"
            color="primary"
            onClick={handlePrevious}
            className={classes.previousButton}
            disabled={step === 1}
          >
            Previous
          </Button>
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={step === 6}
            className={classes.nextButton}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div>
      <Modal
        open={props.open}
        onClose={props.toggle}
        aria-labelledby="simple-modal-title"
        aria-describedby="simple-modal-description"
      >
        {body}
      </Modal>
    </div>
  );
};
