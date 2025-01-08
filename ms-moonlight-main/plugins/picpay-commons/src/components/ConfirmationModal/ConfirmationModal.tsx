import React from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogActions,
  DialogTitle,
} from '@material-ui/core';

export const ConfirmationModal = (props: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  body: any;
  title?: string;
  disabledAction?: boolean;
}) => (
  <Dialog open={props.open} onClose={props.onClose}>
    <DialogTitle id="responsive-dialog-title">
      {props.title ?? 'Confirm this action?'}
    </DialogTitle>
    <DialogContent>{props.body}</DialogContent>
    <DialogActions>
      <Button
        variant="contained"
        color="primary"
        disabled={props.disabledAction}
        onClick={props.onConfirm}
      >
        Confirm
      </Button>
      <Button color="secondary" onClick={props.onClose}>
        Cancel
      </Button>
    </DialogActions>
  </Dialog>
);
