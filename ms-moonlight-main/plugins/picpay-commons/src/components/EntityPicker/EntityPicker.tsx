import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TextField, CircularProgress, Box, Typography,
  Checkbox, FormControlLabel, Tooltip
} from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import CheckBoxOutlineBlankIcon from '@material-ui/icons/CheckBoxOutlineBlank';
import CheckBoxIcon from '@material-ui/icons/CheckBox';
import { GitHubIcon } from '@backstage/core-components';
import { useStyles } from './styles';
import { debounce } from 'lodash';
import { Entity } from '@backstage/catalog-model';

type EntityType = 'owner' | 'service';

interface EntityPickerProps {
  type: EntityType;
  label?: string;
  multiSelect?: boolean;
  onSelect?: (selectedEntities: any[]) => void;
  initialSelected?: string | null;
}

export const EntityPicker: React.FC<EntityPickerProps> = ({
  type,
  label,
  multiSelect = false,
  onSelect,
  initialSelected
}) => {
  const classes = useStyles();
  const catalogApi = useApi(catalogApiRef);
  const [entities, setEntities] = useState<any[]>([]);
  const [filteredEntities, setFilteredEntities] = useState<any[]>([]);
  const [selectedValue, setSelectedValue] = useState<Entity[]>([]);
  const [initialSet, setInitialSet] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchEntities = async () => {
      setLoading(true);
      try {
        const filter: Record<string, string | string[]> =
          type === 'owner'
            ? { kind: ['Group'], 'metadata.namespace': 'default' }
            : { kind: ['Component', 'System', 'API', 'Resource'] };

        const response = await catalogApi.getEntities({ filter, fields: ['metadata.name'] });

        const orderedEntities = (response.items || []).sort((a, b) => {
          const entityNameA = a.metadata.name.toLowerCase();
          const entityNameB = b.metadata.name.toLowerCase();
          return entityNameA.localeCompare(entityNameB);
        });

        setEntities(orderedEntities);
        setFilteredEntities(orderedEntities.slice(0, 50));
      } catch (err) {
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [type, catalogApi]);

  useEffect(() => {
    if (!initialSet && initialSelected && entities.length > 0) {
      const initialSelectedEntities = entities.filter((entity) =>
        entity.metadata.name === initialSelected
      );
      setSelectedValue(initialSelectedEntities);
      setInitialSet(true);
    }
  }, [initialSelected, entities, initialSet]);

  const handleInputChange = useMemo(() => debounce(async (_, value) => {
    const lowerValue = value?.toLowerCase() || '';

    const filtered = entities
      .filter(entity =>
        entity.metadata.name.toLowerCase().includes(lowerValue)
      )
      .sort((a, b) => {
        const entityNameA = a.metadata.name.toLowerCase();
        const entityNameB = b.metadata.name.toLowerCase();

        if (entityNameA === lowerValue) return -1;
        if (entityNameB === lowerValue) return 1;

        if (entityNameA.startsWith(lowerValue) && !entityNameB.startsWith(lowerValue)) return -1;
        if (!entityNameA.startsWith(lowerValue) && entityNameB.startsWith(lowerValue)) return 1;

        return entityNameA.localeCompare(entityNameB);
      });

    setFilteredEntities(filtered.slice(0, 50));
  }, 300), [entities]);

  const renderOption = useCallback(
    (option: any, { selected }: { selected: boolean }) => (
      <Box className={classes.fullWidth}>
        <FormControlLabel
          className={classes.fullWidth}
          control={
            multiSelect ? (
              <Checkbox
                icon={<CheckBoxOutlineBlankIcon fontSize="small" />}
                checkedIcon={<CheckBoxIcon fontSize="small" />}
                checked={selected}
              />
            ) : (
              <div />
            )
          }
          onClick={(event) => event.preventDefault()}
          label={
            <Tooltip title={option.metadata.title || option.metadata.name}>
              <Box display="flex" alignItems="center">
                {type === 'owner' && <GitHubIcon fontSize="small" />}
                &nbsp;
                <Box className={classes.boxLabel}>
                  <Typography noWrap>
                    {option.metadata.title || option.metadata.name || 'Unnamed Entity'}
                  </Typography>
                </Box>
              </Box>
            </Tooltip>
          }
        />
      </Box>
    ),
    [classes.fullWidth, classes.boxLabel, multiSelect, type]
  );

  if (loading) return <CircularProgress />;
  if (error) return <Typography color="error">Error loading entities: {error.message}</Typography>;
  const filterLabel = label ?? (type === 'owner' ? 'Owner' : 'Service');
  return (
    <Box pb={1} pt={1}>
      <Typography variant="button" component="label">
        {filterLabel}
      </Typography>
      <Autocomplete
        multiple={multiSelect}
        options={filteredEntities}
        getOptionLabel={(option) => option?.metadata?.name || option?.[0]?.metadata?.name || ''}
        value={selectedValue}
        onChange={(_, newValue) => {
          setSelectedValue(newValue || []);
          if (onSelect) {
            if (Array.isArray(newValue)) {
              const selectedNames = newValue.map((entity) => entity?.metadata?.name);
              onSelect(selectedNames);
            } else if (newValue) {
              const selectedName = newValue?.metadata?.name;
              onSelect([selectedName]);
            } else {
              onSelect([]);
            }
          }
        }}
        onInputChange={handleInputChange}
        renderOption={renderOption}
        disableCloseOnSelect={multiSelect}
        disablePortal
        renderInput={(params) => (
          <TextField
            {...params}
            variant="outlined"
            fullWidth
            InputProps={{
              ...params.InputProps,
              endAdornment: (
                <>
                  {loading ? <CircularProgress color="inherit" size={20} /> : null}
                  {params.InputProps.endAdornment}
                </>
              ),
            }}
          />
        )}
      />
    </Box>
  );
};
