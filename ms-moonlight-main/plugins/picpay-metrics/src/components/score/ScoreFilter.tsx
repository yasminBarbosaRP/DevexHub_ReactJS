import React, { useCallback } from 'react';
import { EntityPicker } from '@internal/plugin-picpay-commons';
import { Box, FormControl, makeStyles } from '@material-ui/core';

const useStyles = makeStyles(() => ({
  container: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  formItem: {
    minWidth: '100%',
  }
}));

type ScoreFiltersProps = {
  onOwnerSelect?: (owner: string | null) => void;
  initialOwner?: string | null;
};

const ScoreFilters = ({
  onOwnerSelect,
  initialOwner,
}: ScoreFiltersProps) => {
  const classes = useStyles();

  const handleSelect = useCallback((selectedEntities: string[]) => {
    const selected = selectedEntities.length > 0 ? selectedEntities[0] : null;
    onOwnerSelect?.(selected);
  }, [onOwnerSelect]);

  return (
      <Box className={classes.container}>
        <FormControl className={classes.formItem}>
          <EntityPicker
            label='Squad'
            type="owner"
            onSelect={handleSelect}
            initialSelected={initialOwner}
          />
        </FormControl>
      </Box>
  );
};

export default ScoreFilters;
