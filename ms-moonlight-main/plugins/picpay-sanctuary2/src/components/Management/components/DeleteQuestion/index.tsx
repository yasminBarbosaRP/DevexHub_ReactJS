import * as React from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Tooltip,
} from '@material-ui/core';
import Cancel from '@material-ui/icons/Cancel';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';

interface Props {
  handler: Function;
  className?: string;
}

export const DeleteQuestion = ({ handler, className }: Props) => {
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const alertApi = useApi(alertApiRef);

  const handleClickOpen = () => {
    setOpen(true);
  };

  const handleDisagree = () => {
    if (loading) {
      return;
    }
    setOpen(false);
  };

  const handleAgree = async () => {
    try {
      setLoading(true);
      await handler();
    } catch (err: any) {
      alertApi.post({
        message:
          err?.message ||
          'An error occurred while executing the cancellation. Try again in a moment.',
        severity: 'error',
      });
    } finally {
      setLoading(false);
      setOpen(false);
    }
  };

  return (
    <div>
      <Tooltip title="Cancel deletion">
        <Button
          data-testid="cancel-deletion"
          className={className}
          variant="outlined"
          color="secondary"
          onClick={handleClickOpen}
          startIcon={<Cancel />}
        >
          Cancel
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={handleDisagree}>
        <DialogTitle>Are you sure?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Do you really want to cancel these request? This process cannot be
            undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button disabled={loading} onClick={handleDisagree}>
            RETURN
          </Button>
          <Button disabled={loading} onClick={handleAgree}>
            {loading ? 'CANCELING...' : 'YEP, CANCEL IT'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};
