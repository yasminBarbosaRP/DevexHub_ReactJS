import React from 'react';
import { useStyles } from './styles';
import CheckIcon from '@material-ui/icons/Check';
import AccessTimeIcon from '@material-ui/icons/AccessTime';
import BlockIcon from '@material-ui/icons/Block';
import { ReviewerStatus } from '../../../../models';

interface Props {
  type: ReviewerStatus | string;
  value: string;
}

export const Pills = (props: Props) => {
  const { type, value } = props;
  const classes = useStyles();

  return (
    <>
      {type === ReviewerStatus.PENDING && (
        <div data-testid="pending" className={classes.reviewerPending}>
          {value}
          <AccessTimeIcon className={classes.icon} fontSize="small" />
        </div>
      )}
      {type === ReviewerStatus.APPROVED && (
        <div data-testid="approved" className={classes.reviewer}>
          {value}
          <CheckIcon className={classes.icon} fontSize="small" />
        </div>
      )}
      {type === ReviewerStatus.REJECTED && (
        <div data-testid="rejected" className={classes.reviewerRejected}>
          {value}
          <BlockIcon className={classes.icon} fontSize="small" />
        </div>
      )}
    </>
  );
};
