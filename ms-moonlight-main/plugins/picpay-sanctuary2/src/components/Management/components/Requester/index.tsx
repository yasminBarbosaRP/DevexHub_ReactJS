import React from 'react';
import { Card, Grid } from '@material-ui/core';
import moment from 'moment';
import { Info } from '../Info';
import { StatusResponse } from '../../../../models';
import { useStyles } from './styles';

interface Props {
  data: StatusResponse | null;
}

export const Requester = (props: Props) => {
  const { data } = props;
  const classes = useStyles();

  return (
    data && (
      <Grid data-testid="requester-component" item xs={12} md={12}>
        <Card>
          <div className={classes.content}>
            <Info label="Requested by:" value={data.requestedBy} />|
            <Info
              label="Created at:"
              value={moment(data.createdAt).format('DD/MM/YYYY')}
            />
            |
            <Info
              label="Updated at:"
              value={moment(data.updatedAt).format('DD/MM/YYYY')}
            />
            |
            <Info label="Action:" value="DELETE" />
            {data.deletionSchedule ? (
              <>
                |{' '}
                <Info
                  label="Deletion:"
                  value={moment(data.deletionSchedule).format(
                    'DD/MM/YYYY hh:mm',
                  )}
                />
              </>
            ) : (
              <></>
            )}
          </div>
        </Card>
      </Grid>
    )
  );
};
