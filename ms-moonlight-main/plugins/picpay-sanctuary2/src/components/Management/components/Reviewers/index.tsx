import React from 'react';
import { Grid, TextField } from '@material-ui/core';
import InfoOutlinedIcon from '@material-ui/icons/InfoOutlined';
import { CopyTextButton, InfoCard } from '@backstage/core-components';
import { Reviewer } from '../../../../models';
import { Pills } from '../Pills';
import { useStyles } from './styles';

interface Props {
  reviewers: Reviewer[] | undefined;
}

export const Reviewers = (props: Props) => {
  const { reviewers } = props;
  const classes = useStyles();

  if (!reviewers || !reviewers.length) {
    return <></>;
  }

  return (
    <Grid data-testid="reviewers-component" item xs={12} md={12}>
      <InfoCard title="Reviewers">
        <Grid container spacing={0}>
          {reviewers.map((el, i) => {
            return (
              <Grid item key={`reviewerName-${i}`}>
                <Pills type={el.status} value={el.githubProfile} />
              </Grid>
            );
          })}
        </Grid>

        <div className={classes.content}>
          <div className={classes.title}>
            <InfoOutlinedIcon className={classes.infoOutlined} />
            You can also share this link with approvers:
          </div>
          <div className={classes.copyLink}>
            <TextField
              className={classes.textField}
              variant="outlined"
              value={window.location.href}
              disabled
            />
            <div>
              <CopyTextButton text={window.location.href} />
            </div>
          </div>
          <p>
            ● Minimum required for approval:
            {` ${Math.ceil((reviewers.length * 51) / 100)}`}
          </p>
        </div>
      </InfoCard>
    </Grid>
  );
};
