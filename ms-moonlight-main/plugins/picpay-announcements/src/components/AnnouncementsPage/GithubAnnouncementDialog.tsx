import React from 'react';
import { Button, Dialog, DialogActions, DialogTitle } from '@material-ui/core';

export type GithubAnnouncementDialogProps = {
  open: boolean;
  onConfirm: () => any;
  onCancel: () => any;
};

export const GithubAnnouncementDialog = (
  props: GithubAnnouncementDialogProps,
) => {
  const { open, onConfirm, onCancel } = props;

  return (
    <Dialog open={open} onClose={onCancel}>
      <DialogTitle>Push this announcement to Github?</DialogTitle>

      <DialogActions>
        <Button onClick={onCancel} color="default">
          No
        </Button>

        <Button onClick={onConfirm} color="secondary">
          Yes
        </Button>
      </DialogActions>
    </Dialog>
  );
};
