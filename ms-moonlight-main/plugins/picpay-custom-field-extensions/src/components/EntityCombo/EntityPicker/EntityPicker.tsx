/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
import {
  type EntityFilterQuery,
  CATALOG_FILTER_EXISTS,
} from '@backstage/catalog-client';
import {
  CompoundEntityRef,
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  humanizeEntityRef,
} from '@backstage/plugin-catalog-react';
import { TextField } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Autocomplete, {
  AutocompleteChangeReason,
} from '@material-ui/lab/Autocomplete';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  EntityPickerFilterQueryValue,
  EntityPickerProps,
  EntityPickerUiOptions,
  EntityPickerFilterQuery,
} from './schema';
import { usePrevious } from 'react-use';
import lodash from 'lodash';
import { TemplateContext } from '@internal/plugin-picpay-commons';

export { EntityPickerSchema } from './schema';

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */


export const EntityPicker = (
  props: EntityPickerProps & { useLabel: string },
) => {
  const {
    onChange,
    schema: { title = 'Entity', description = 'An entity from the catalog' },
    required,
    uiSchema,
    rawErrors,
    formData,
    idSchema,
    useLabel,
    noOptionsText = 'No options found',
  } = props;
  const [catalogFilter, setCatalogFilter] = useState<EntityFilterQuery | undefined>(undefined);
  const [selectedEntity, setSelectedEntity] = useState<string | Entity>('');
  const prevCatalogFilter = usePrevious(catalogFilter);
  const [entities, setEntities] = useState<Entity[] | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const catalogApi = useApi(catalogApiRef);

  const { processItem, loading: identityIsLoading } = useContext(TemplateContext);

  const removeEmptyValues = (obj: object): any => {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_, value]) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0) && !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0))
    );
  }

  useEffect(() => {
    if (identityIsLoading) return;
    let actualCatalogFilter = buildCatalogFilter(uiSchema);
    if (actualCatalogFilter) {
      if (Array.isArray(actualCatalogFilter)) {
        for (let i = 0; i < actualCatalogFilter.length; i++) {
          const result = processItem(actualCatalogFilter[i]);
          actualCatalogFilter[i] = removeEmptyValues(result);
        }
      } else if (typeof actualCatalogFilter === 'object') {
        actualCatalogFilter = removeEmptyValues(processItem(actualCatalogFilter));
      }
    }
    setCatalogFilter(actualCatalogFilter);
  }, [uiSchema, processItem, identityIsLoading]);

  const defaultKind = uiSchema['ui:options']?.defaultKind;
  const defaultNamespace =
    uiSchema['ui:options']?.defaultNamespace || undefined;

  const getEntities = useCallback(
    async (c: any) => {
      const { items } = await catalogApi.getEntities(
        c ? { filter: c } : undefined,
      );
      return items;
    },
    [catalogApi],
  );

  useEffect(() => {
    if (JSON.stringify(prevCatalogFilter) === JSON.stringify(catalogFilter)) return;
    setLoading(true);

    let actualCatalogFilter = catalogFilter;
    if (actualCatalogFilter) {
      if (Array.isArray(actualCatalogFilter)) {
        for (let i = 0; i < actualCatalogFilter.length; i++) {
          actualCatalogFilter[i] = processItem(actualCatalogFilter[i]);
        }
      } else if (typeof actualCatalogFilter === 'object') {
        actualCatalogFilter = processItem(actualCatalogFilter);
      }
    }

    getEntities(actualCatalogFilter)
      .then(r => {
        setEntities(r);
      })
      .finally(() => setLoading(false));
  }, [prevCatalogFilter, processItem, catalogFilter, getEntities]);

  const allowArbitraryValues =
    uiSchema['ui:options']?.allowArbitraryValues ?? true;

  const getLabel = useCallback(
    (ref: string) => {
      try {
        const entityRef = parseEntityRef(ref, {
          defaultKind,
          defaultNamespace,
        });
        if (useLabel) {
          const entityInfo = entities?.find(
            e =>
              e.kind === entityRef.kind &&
              e.metadata.namespace === entityRef.namespace &&
              e.metadata.name === entityRef.name,
          );
          return lodash.get(entityInfo, useLabel, ref);
        }
        return humanizeEntityRef(entityRef, {
          defaultKind,
          defaultNamespace,
        });
      } catch (err) {
        return ref;
      }
    },
    [defaultKind, defaultNamespace, entities, useLabel],
  );
  const realEntityName = (name: string, namespace: string): string => {
    if (name === '' && namespace === '') return '';
    if (namespace !== 'default') {
      return `${namespace}/${name}`;
    }
    return name;
  };

  const onSelect = useCallback(
    (_: any, ref: string | Entity | null, reason: AutocompleteChangeReason) => {
      // ref can either be a string from free solo entry or
      if (typeof ref !== 'string') {
        // if ref does not exist: pass 'undefined' to trigger validation for required value
        setSelectedEntity(ref ? humanizeEntityRef(ref) : '');
        onChange(
          realEntityName(
            ref?.metadata?.name || '',
            ref?.metadata?.namespace || '',
          ),
        );
      } else {
        if (reason === 'blur' || reason === 'create-option') {
          // Add in default namespace, etc.
          let entityRef = ref;
          try {
            // Attempt to parse the entity ref into it's full form.
            setSelectedEntity(ref);
            const e = parseEntityRef(ref as string, {
              defaultKind,
              defaultNamespace,
            });
            entityRef = realEntityName(e?.name || '', e?.namespace || '');
          } catch (err) {
            // If the passed in value isn't an entity ref, do nothing.
          }
          // We need to check against formData here as that's the previous value for this field.
          if (formData !== ref || allowArbitraryValues) {
            onChange(entityRef);
          }
        }
      }
    },
    [onChange, formData, defaultKind, defaultNamespace, allowArbitraryValues],
  );

  // Since free solo can be enabled, attempt to parse as a full entity ref first, then fall
  // back to the given value.

  useEffect(() => {
    if (entities?.length === 1 && selectedEntity === '') {
      onChange(stringifyEntityRef(entities[0]));
    }
  }, [entities, onChange, selectedEntity]);

  useEffect(() => {
    const entityRef: CompoundEntityRef = {
      kind: defaultKind ?? '',
      namespace: !formData?.includes('/')
        ? defaultNamespace ?? 'default'
        : formData.split('/')[0],
      name: formData || '',
    };
    const result =
      entities?.find(
        e => stringifyEntityRef(e) === stringifyEntityRef(entityRef),
      ) ?? (allowArbitraryValues && formData ? getLabel(formData) : '');
    setSelectedEntity(result);
  }, [
    entities,
    defaultKind,
    defaultNamespace,
    formData,
    allowArbitraryValues,
    getLabel,
  ]);

  return (
    <>
      <FormControl
        margin="normal"
        required={required}
        error={rawErrors?.length > 0 && !formData}
      >
        <Autocomplete
          disabled={entities?.length === 1}
          noOptionsText={noOptionsText ?? `No options found`}
          id={idSchema?.$id}
          value={selectedEntity || null}
          loading={loading}
          onChange={onSelect}
          options={entities || []}
          getOptionLabel={option => {
            if (typeof option === 'string') return option;
            const humanizedEntityRef = humanizeEntityRef(option, {
              defaultKind,
              defaultNamespace,
            });
            if (useLabel)
              return lodash.get(option, useLabel, humanizedEntityRef);
            return humanizedEntityRef!;
          }}
          autoSelect
          freeSolo={allowArbitraryValues}
          renderInput={params => (
            <TextField
              {...params}
              label={title}
              margin="dense"
              helperText={description}
              FormHelperTextProps={{
                margin: 'dense',
                style: { marginLeft: 0 },
              }}
              variant="outlined"
              required={required}
              InputProps={params.InputProps}
            />
          )}
        />
      </FormControl>
    </>
  );
};

/**
 * Converts a especial `{exists: true}` value to the `CATALOG_FILTER_EXISTS` symbol.
 *
 * @param value - The value to convert.
 * @returns The converted value.
 */
function convertOpsValues(
  value: Exclude<EntityPickerFilterQueryValue, Array<any>>,
): string | symbol {
  if (typeof value === 'object' && value?.exists) {
    return CATALOG_FILTER_EXISTS;
  }
  return value?.toString();
}

/**
 * Converts schema filters to entity filter query, replacing `{exists:true}` values
 * with the constant `CATALOG_FILTER_EXISTS`.
 *
 * @param schemaFilters - An object containing schema filters with keys as filter names
 * and values as filter values.
 * @returns An object with the same keys as the input object, but with `{exists:true}` values
 * transformed to `CATALOG_FILTER_EXISTS` symbol.
 */
function convertSchemaFiltersToQuery(
  schemaFilters: EntityPickerFilterQuery,
): Exclude<EntityFilterQuery, Array<any>> {
  const query: EntityFilterQuery = {};

  for (const [key, value] of Object.entries(schemaFilters)) {
    if (Array.isArray(value)) {
      query[key] = value;
    } else {
      query[key] = convertOpsValues(value);
    }
  }

  return query;
}

/**
 * Builds an `EntityFilterQuery` based on the `uiSchema` passed in.
 * If `catalogFilter` is specified in the `uiSchema`, it is converted to a `EntityFilterQuery`.
 * If `allowedKinds` is specified in the `uiSchema` will support the legacy `allowedKinds` option.
 *
 * @param uiSchema The `uiSchema` of an `EntityPicker` component.
 * @returns An `EntityFilterQuery` based on the `uiSchema`, or `undefined` if `catalogFilter` is not specified in the `uiSchema`.
 */
function buildCatalogFilter(
  uiSchema: EntityPickerProps['uiSchema'],
): EntityFilterQuery | undefined {
  const allowedKinds = uiSchema['ui:options']?.allowedKinds;

  const catalogFilter: EntityPickerUiOptions['catalogFilter'] | undefined =
    uiSchema['ui:options']?.catalogFilter ||
    (allowedKinds && { kind: allowedKinds });

  if (!catalogFilter) {
    return undefined;
  }

  if (Array.isArray(catalogFilter)) {
    return catalogFilter.map(convertSchemaFiltersToQuery);
  }

  return convertSchemaFiltersToQuery(catalogFilter);
}
