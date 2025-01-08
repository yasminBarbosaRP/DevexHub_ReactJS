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
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  humanizeEntityRef,
} from '@backstage/plugin-catalog-react';
import { makeStyles, TextField, Theme, Typography } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Autocomplete, { createFilterOptions } from '@material-ui/lab/Autocomplete';
import {
  GetEntitiesResponse,
  type EntityFilterQuery,
  GetEntitiesRequest,
} from '@backstage/catalog-client';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import _ from 'lodash';
import { DEFAULT_NAMESPACE, Entity, parseEntityRef } from '@backstage/catalog-model';
import ErrorSchema, { IChangeEvent } from '@rjsf/core';
import { isEntityRef, TemplateContext } from '@internal/plugin-picpay-commons';
import nunjucks from 'nunjucks';
import { DEFAULT_FIELDS, DEFAULT_FULL_TEXT_FIELDS } from '../../const';

/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */
export interface ComponentPickerUiOptions {
  catalogFilter?: EntityFilterQuery;
  defaultKind?: string;
  allowArbitraryValues?: boolean;
  allowedKinds?: string[];
  allowedTypes?: string[];
  useLabel?: string;
  useValue?: string;
  useDescription?: string;
  group?: {
    key: string;
  };
  defaultNamespace?: string | false;
}

type Option = {
  id: string;
  label: string;
  description?: string;
  entity?: Entity;
};

type onChangeType<T> = (
  entityId: IChangeEvent<T> | any,
  err: ErrorSchema | any,
  entity: Entity | any,
) => any;

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */

const njucks = nunjucks.configure({
  throwOnUndefined: false,
  autoescape: false,
});

export const useStyles = makeStyles((theme: Theme) => ({
  label: {
    color: theme.palette.text.secondary,
    textTransform: 'uppercase',
    fontSize: '10px',
    fontWeight: 'bold',
    letterSpacing: 0.5,
    overflow: 'hidden',
    whiteSpace: 'nowrap',
  },
}));


export const ComponentPicker = (
  props: FieldExtensionComponentProps<string, ComponentPickerUiOptions> & {
    onChangeWithEntity?: onChangeType<string>;
  },
) => {
  const {
    schema: { title = 'Entity', description = 'An entity from the catalog' },
    required,
    uiSchema,
    rawErrors,
    formData,
    idSchema,
  } = props;
  const catalogApi = useApi(catalogApiRef);
  const alertApi = useApi(alertApiRef);
  const classes = useStyles();

  const allowedKinds = uiSchema['ui:options']?.allowedKinds;
  const allowedTypes = uiSchema['ui:options']?.allowedTypes;
  const catalogFilter = uiSchema['ui:options']?.catalogFilter;
  const defaultKind = uiSchema['ui:options']?.defaultKind;
  const useLabel = uiSchema['ui:options']?.useLabel ?? '';
  const useDescription = uiSchema['ui:options']?.useDescription ?? '';
  const useValue = uiSchema['ui:options']?.useValue ?? '';
  const typeToSearch = uiSchema['ui:options']?.typeToSearch ?? false;
  const hideOptions = uiSchema['ui:options']?.hideOptions as string;
  const additionalQueryFields = useMemo(() => uiSchema['ui:options']?.additionalQueryFields as string[] ?? [], [uiSchema]);
  const group = uiSchema['ui:options']?.group;
  const defaultNamespace = uiSchema['ui:options']?.defaultNamespace as string | undefined;
  const allowArbitraryValues = uiSchema['ui:options']?.allowArbitraryValues;
  const [previousQuery, setPreviousQuery] = useState<string | undefined>();
  const [entities, setEntities] = useState<GetEntitiesResponse | undefined>(
    undefined,
  );

  const [inputValue, setInputValue] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [entityRefs, setEntityRefs] = useState<Option[]>();
  const [lastFilter, setLastFilter] = useState<string>('');
  const [filter, setFilter] = useState<GetEntitiesRequest | undefined>(
    undefined,
  );
  const { processItem, loading: isLoading, extractIdentityValue } = useContext(TemplateContext);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const removeEmptyValues = (obj: object): any => {
    return Object.fromEntries(
      Object.entries(obj)
        .filter(([_k, value]) => value !== null && value !== undefined && value !== '' && !(Array.isArray(value) && value.length === 0) && !(typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0))
    );
  }

  const onChangeBroadcast = useCallback(
    (
      entityId: IChangeEvent<string> | any,
      err: ErrorSchema | any,
      entity: Entity | any,
    ) => {
      if (props.onChange) {
        props.onChange(entityId, err);
      }
      if (props.onChangeWithEntity) {
        props.onChangeWithEntity(entityId, err, entity);
      }
    },
    [props],
  );

  useEffect(() => {
    if (isLoading) return;

    if (catalogFilter) {
      let actualCatalogFilter = catalogFilter
      if (Array.isArray(actualCatalogFilter)) {
        for (let i = 0; i < actualCatalogFilter.length; i++) {
          const result = processItem(actualCatalogFilter[i]);
          actualCatalogFilter[i] = removeEmptyValues(result);
        }
      } else if (typeof actualCatalogFilter === 'object') {
        actualCatalogFilter = removeEmptyValues(processItem(actualCatalogFilter));
      }
      setFilter({ filter: actualCatalogFilter });
      return;
    }
    if (allowedKinds && allowedTypes) {
      setFilter({ filter: { kind: processItem(allowedKinds), 'spec.type': processItem(allowedTypes) } });
      return;
    }
    if (allowedTypes) {
      setFilter({ filter: { 'spec.type': processItem(allowedTypes) } });
      return;
    }
    if (allowedKinds) {
      setFilter({ filter: { kind: processItem(allowedKinds) } });
      return;
    }

    setFilter(undefined);
  }, [catalogFilter, isLoading, allowedKinds, allowedTypes, processItem]);

  const refreshEntities = useCallback(async (text?: string) => {
    const currentFilter = JSON.stringify(filter);
    if (lastFilter === currentFilter && !typeToSearch || !filter) {
      return;
    }

    if (loading) return;

    setLoading(true);

    let actualCatalogFilter = filter;
    if (actualCatalogFilter) {
      if (Array.isArray(actualCatalogFilter)) {
        for (let i = 0; i < actualCatalogFilter.length; i++) {
          actualCatalogFilter[i] = processItem(actualCatalogFilter[i]);
        }
      } else if (typeof actualCatalogFilter === 'object') {
        actualCatalogFilter = processItem(actualCatalogFilter);
      }
    }
    try {
      let nextCursor: string | undefined;
      const entityResults: Entity[] = [];
      do {
        const results = await catalogApi.queryEntities({
          ...actualCatalogFilter, limit: 1000, fields: [...DEFAULT_FIELDS, ...DEFAULT_FULL_TEXT_FIELDS, ...additionalQueryFields], cursor: nextCursor, fullTextFilter: typeToSearch && text ? {
            term: text,
            fields: [...DEFAULT_FULL_TEXT_FIELDS, ...additionalQueryFields].map(e => e.toLocaleLowerCase('en-US')),
          } : undefined
        })
        if (results.items.length === 0) break;
        entityResults.push(...results.items);
        nextCursor = results.pageInfo.nextCursor;
      } while (nextCursor)
      setLastFilter(currentFilter);
      setEntities({ items: entityResults });
      setPreviousQuery(text);
    } catch (err: any) {
      alertApi.post({ message: `Error getting entities: ${err?.message}`, severity: 'error' });
    } finally {
      setLoading(false)
    }
  }, [filter, loading, catalogApi, lastFilter, alertApi, processItem, typeToSearch, additionalQueryFields]);

  useEffect(() => {
    if (!typeToSearch) refreshEntities();
  }, [typeToSearch, refreshEntities]);

  useEffect(() => {
    if (!formData) return;
    const query = isEntityRef(formData) ? parseEntityRef(formData, { defaultKind, defaultNamespace: defaultNamespace ?? DEFAULT_NAMESPACE }).name : formData;
    if (typeToSearch && !typingTimeoutRef?.current && JSON.stringify(previousQuery) !== JSON.stringify(query) && entityRefs?.length === 0) {
      refreshEntities(query);
    }
  }, [formData, typeToSearch, typingTimeoutRef, refreshEntities, previousQuery, entityRefs, defaultKind, defaultNamespace]);

  const handleKeyDown = useCallback((event: any) => {
    if (!typeToSearch || !event?.target?.value) return;
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      refreshEntities(event?.target?.value as string);
    }, 400);
  }, [typeToSearch, refreshEntities]);

  const getFiltered = useCallback((): Option[] => {
    const result: { [key: string]: Option } = {};
    const entityItems = entities?.items ?? [];

    let prevError: any;
    const renderString = (obj: any, template: string) => {
      try {
        return njucks.renderString(!template.startsWith("{{") ? `{{${template}}}` : template, obj)
      } catch (err: any) {
        if (prevError !== err.message) {
          prevError = err.message;
          alertApi.post({ message: `Error rendering template: ${template}. ${err.message}`, severity: 'error' });
        }
        return template;
      }
    }
    for (const item of entityItems) {
      if (hideOptions && extractIdentityValue(hideOptions, false, { entity: item }) !== "true") {
        continue;
      }
      const entityName = humanizeEntityRef(item, {
        defaultKind,
        defaultNamespace,
      });

      let id: string = entityName;
      let displayName: string = entityName;
      let customDescription: string | undefined = undefined;

      if (useLabel) {
        displayName = renderString(item, useLabel);
      }

      if (useDescription) {
        customDescription = renderString(item, useDescription);
      }

      if (useValue) {
        id = renderString(item, useValue);
      }

      if (!id) continue;
      if (group?.key) {
        const duplicates = entityItems.filter(
          (x: Entity) => renderString(x, useLabel) === displayName,
        );
        if (duplicates?.length > 0) {
          displayName += ` [${duplicates
            .map(e => renderString(e, group.key))
            .join(', ')}]`;
        }
      }
      if (!result[id]) {
        result[id] = { id, label: displayName, description: customDescription, entity: item };
      }
    }
    return Object.keys(result).map(k => result[k]);
  }, [
    entities,
    alertApi,
    group,
    defaultKind,
    defaultNamespace,
    useLabel,
    useDescription,
    useValue,
    hideOptions,
    extractIdentityValue
  ]);

  const onSelect = useCallback(
    (value: Option | string | null): any => {
      if (!value) {
        onChangeBroadcast(undefined, undefined, undefined);
        return;
      }

      if (typeof value === 'string') {
        onChangeBroadcast(value, undefined, undefined);
        return;
      }

      onChangeBroadcast(value?.id, undefined, value?.entity);
    },
    [onChangeBroadcast],
  );

  useEffect(() => {
    setEntityRefs(getFiltered());
  }, [entities, getFiltered]);

  useEffect(() => {
    if (entityRefs?.length === 1) {
      onChangeBroadcast(entityRefs[0].id, undefined, entityRefs[0].entity);
    }
  }, [entityRefs, onChangeBroadcast]);

  return (
    <>
      <FormControl
        margin="normal"
        required={required}
        error={rawErrors?.length > 0 && !formData}
      >
        <Autocomplete
          disabled={!typeToSearch && entityRefs?.length === 1}
          id={idSchema?.$id}
          inputValue={!!inputValue ? inputValue : entityRefs?.find(e => e.id === formData)?.label ?? ''}
          value={
            allowArbitraryValues
              ? { label: formData || '', id: formData || '' }
              : entityRefs?.find(e => e.id === formData) || null
          }
          noOptionsText={typeToSearch ? 'Type to Search' : 'No Entity found'}
          onInputChange={(event, value, reason) => {
            if (inputValue !== value) setInputValue(value);
            if (!typeToSearch) return;
            if (!value && reason === 'reset') {
              setInputValue('')
              return;
            }
            if (reason === 'clear') {
              onSelect(null);

              if (!value) {
                setEntities(undefined);
              }
              return;
            }
            if (value) handleKeyDown(event);
          }}
          loading={loading}
          onChange={(_event, value, reason) => {
            if (reason === 'clear') {
              onSelect(null);
              setInputValue('');

              if (typeToSearch) {
                setEntities(undefined);
              }
              return
            };
            onSelect(value)
          }}
          getOptionLabel={option => option.label || ''}
          options={entityRefs || []}
          autoSelect
          freeSolo={allowArbitraryValues ?? true}
          renderOption={(option) => (
            <div>
              {option.label}
              {option.description && <Typography className={classes.label}>{option.description}</Typography>}
            </div>
          )}
          filterOptions={createFilterOptions({
            stringify: (option) => {
              const allFields = [...DEFAULT_FIELDS, ...DEFAULT_FULL_TEXT_FIELDS, ...additionalQueryFields];
              return `${option.label ?? ''} ${option.description ?? ''} ${allFields.map(field => _.get(option?.entity, field, '')).join(' ')}`;
            },
          })}
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