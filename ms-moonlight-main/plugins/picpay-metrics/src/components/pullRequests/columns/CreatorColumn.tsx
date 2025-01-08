import React from 'react';
import { makeStyles } from '@material-ui/core/styles';
import { EntityRefLink } from '@backstage/plugin-catalog-react';
import { Avatar } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  creatorContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  }
}));

export const CreatorColumn: React.FC<{ creator: any }> = ({ creator }) => {
  const classes = useStyles();

  return (
    <div className={classes.creatorContainer}>
      {creator.entityRef ? (
        <EntityRefLink entityRef={creator.entityRef}>
          <div title={creator.name}>
            <Avatar src={creator.picture} />
          </div>
        </EntityRefLink>
      ) : (
        <div title={creator.name}>
          <Avatar src={creator.picture} />
        </div>
      )}
    </div>
  );
};
