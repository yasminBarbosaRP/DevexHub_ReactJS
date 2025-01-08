import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { Avatar } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  avatarContainer: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px',
    justifyContent: 'center',
  },
  avatarItem: {
    flex: '0 0 20%',
    boxSizing: 'border-box',
  },
}));

export const ApproversColumn: React.FC<{ approvers: any[] }> = ({ approvers }) => {
  const classes = useStyles();

  return (
    <div className={classes.avatarContainer}>
      {approvers.map((approver, index) => (
        <div className={classes.avatarItem} key={index}>
          {approver.entityRef ? (
            <EntityRefLink entityRef={approver.entityRef}>
              <div title={approver.name}>
                <Avatar src={approver.picture} />
              </div>
            </EntityRefLink>
          ) : (
            <div title={approver.name}>
              <Avatar src={approver.picture} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
