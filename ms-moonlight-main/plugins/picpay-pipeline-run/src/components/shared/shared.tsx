import { PipelineStatus, Status } from '../../interfaces';
import AlarmAddIcon from '@material-ui/icons/AlarmAdd';
import { Button } from '@material-ui/core';
import React from 'react';

export const pipelineItems = [
  { label: 'All', value: PipelineStatus.All },
  { label: 'Pull Request', value: PipelineStatus.PullRequest },
  { label: 'Deploy QA', value: PipelineStatus.DeployQA },
  { label: 'Push Main', value: PipelineStatus.PushMain },
  { label: 'Deploy Production', value: PipelineStatus.DeployProd },
];

export const statusItems = [
  { label: 'All', value: Status.All },
  { label: 'Running', value: Status.Running },
  { label: 'Success', value: Status.Success },
  { label: 'Error', value: Status.Error },
];

export const oldLogsButton = () => {
  return (
    <Button
      data-testid="old-logs-button"
      color="default"
      startIcon={<AlarmAddIcon />}
      href="https://dashboard.tekton.hub.ppay.me/#/namespaces/tekton-builds/pipelines"
      target="_blank"
    >
      Old Logs
    </Button>
  );
};
