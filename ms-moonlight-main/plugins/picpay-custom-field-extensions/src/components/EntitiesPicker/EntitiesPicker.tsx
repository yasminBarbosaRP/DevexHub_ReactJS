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
  DEFAULT_NAMESPACE,
  Entity,
  parseEntityRef,
  stringifyEntityRef,
} from '@backstage/catalog-model';
import {
  catalogApiRef,
  humanizeEntityRef,
} from '@backstage/plugin-catalog-react';
import { makeStyles, TextField, Theme, Typography } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Autocomplete, {
  AutocompleteChangeReason,
  createFilterOptions,
} from '@material-ui/lab/Autocomplete';
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  EntityPickerFilterQueryValue,
  EntityPickerProps,
  EntityPickerUiOptions,
  EntityPickerFilterQuery,
} from './schema';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { usePrevious } from 'react-use';
import lodash from 'lodash';
import Tooltip from '@material-ui/core/Tooltip';
import { isEntityRef, TemplateContext } from '@internal/plugin-picpay-commons';
import nunjucks from 'nunjucks';
import { DEFAULT_FIELDS, DEFAULT_FULL_TEXT_FIELDS } from '../../const';

export { EntityPickerSchema } from './schema';

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

const njucks = nunjucks.configure({
  throwOnUndefined: false,
  autoescape: false,
});

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const EntitiesPicker = (
  props: EntityPickerProps,
) => {
  const {
    onChange,
    schema: { title = 'Entity', description = 'An entity from the catalog' },
    required,
    uiSchema,
    rawErrors,
    formData,
    idSchema,
    noOptionsText = 'No options found',
  } = props;
  const classes = useStyles();

  const [catalogFilter, setCatalogFilter] = useState<
    EntityFilterQuery | undefined
  >(undefined);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedEntity, setSelectedEntity] = useState<string[]>([]);
  const [entityLabels, setEntityLabels] = useState<{ [k: string]: { label: string, description: string } }>({});
  const prevCatalogFilter = usePrevious(catalogFilter);
  const [entityOptions, setEntityOptions] = useState<Entity[] | undefined>(undefined);
  const [entityCache, setEntityCache] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const [previousQuery, setPreviousQuery] = useState<string[] | undefined>();

  const { processItem, loading: identityIsLoading, extractIdentityValue } = useContext(TemplateContext);

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
  const maxEntities = uiSchema['ui:options']?.maxEntities;
  const useLabel = uiSchema['ui:options']?.useLabel;
  const typeToSearch = uiSchema['ui:options']?.typeToSearch ?? false;
  const useDescription = uiSchema['ui:options']?.useDescription as string;
  const hideOptions = uiSchema['ui:options']?.hideOptions as string;
  const groupBy = uiSchema['ui:options']?.groupBy as string ?? 'spec.lifecycle';
  const tooltipEnabled = uiSchema['ui:options']?.tooltipEnabled as boolean ?? true;
  const additionalQueryFields = useMemo(() => uiSchema['ui:options']?.additionalQueryFields as string[] ?? [], [uiSchema]);
  const defaultNamespace =
    uiSchema['ui:options']?.defaultNamespace as string | undefined;

  const alertApi = useApi(alertApiRef);
  const catalogApi = useApi(catalogApiRef);

  const getEntities = useCallback(
    async (cFilter: any, fullTextFilter?: string) => {

      let nextCursor: string | undefined;
      const entityResults: Entity[] = [];
      do {
        const { items, pageInfo } = await catalogApi.queryEntities({
          filter: cFilter ? cFilter : undefined,
          limit: 1000, fields: [...DEFAULT_FIELDS, ...DEFAULT_FULL_TEXT_FIELDS, ...additionalQueryFields], cursor: nextCursor,
          fullTextFilter: typeToSearch && fullTextFilter ? {
            term: fullTextFilter,
            fields: [...DEFAULT_FULL_TEXT_FIELDS, ...additionalQueryFields].map(e => e.toLocaleLowerCase('en-US'))
          } : undefined,
        })
        if (items.length === 0) break;
        entityResults.push(...(hideOptions ? items.filter((e: Entity) => extractIdentityValue(hideOptions, false, { entity: e }) === "true") : items))
        nextCursor = pageInfo.nextCursor;
      } while (nextCursor);
      return entityResults;
    },
    [catalogApi, typeToSearch, additionalQueryFields, hideOptions, extractIdentityValue],
  );

  const realEntityName = (name: string, namespace: string): string => {
    if (name === '' && namespace === '') return '';
    if (namespace !== 'default') {
      return `${namespace}/${name}`;
    }
    return name;
  };

  const fillOptions = useCallback((query?: string | string[]) => {
    setLoading(true);

    const getAllEntities = async (q?: string | string[]) => {
      if (!Array.isArray(q)) {
        return await getEntities(catalogFilter, q);
      }
      setPreviousQuery(q)
      const entities = await Promise.all(q.map(qs => getEntities(catalogFilter, qs)));
      return entities.flat();
    }

    getAllEntities(query)
      .then(async (r) => {
        setEntityOptions(r);
        const labels = r.reduce((acc: { [k: string]: { label: string, description: string } }, e: Entity) => {
          const label = useLabel ? njucks.renderString(!useLabel.startsWith("{{") ? `{{${useLabel}}}` : useLabel, e) : humanizeEntityRef(e)
          const d = useDescription ? njucks.renderString(!useDescription.startsWith("{{") ? `{{${useDescription}}}` : useDescription, e) : humanizeEntityRef(e)
          acc[stringifyEntityRef(e)] = { label, description: d };
          return acc;
        }, {});
        setEntityLabels(prev => ({ ...prev, ...labels }));
        if (typeToSearch) {
          setEntityCache(prev => {
            const updatedCache = prev ?? [];
            const newEntities = r.filter((entityObject: Entity) => {
              const entityName = realEntityName(entityObject.metadata?.name || '', entityObject.metadata?.namespace || '');
              const existsInCache = updatedCache.some(p => {
                const prevEntityName = realEntityName(p.metadata?.name || '', p.metadata?.namespace || '');
                return prevEntityName === entityName;
              });

              return !existsInCache;
            });
            return [...updatedCache, ...newEntities];
          });
        }
      })
      .finally(() => setLoading(false));
  }, [catalogFilter, getEntities, useLabel, useDescription, typeToSearch, setPreviousQuery]);

  useEffect(() => {
    if (JSON.stringify(prevCatalogFilter) === JSON.stringify(catalogFilter))
      return;

    if (!typeToSearch) fillOptions();
  }, [catalogFilter, typeToSearch, fillOptions, prevCatalogFilter]);


  useEffect(() => {
    if (!formData || formData?.filter(e => e !== undefined).length === 0) return;
    const queries = formData.filter(e => e !== undefined).map(e => isEntityRef(e) ? parseEntityRef(e, { defaultKind, defaultNamespace: defaultNamespace ?? DEFAULT_NAMESPACE }).name : e)
    if (typeToSearch && !typingTimeoutRef?.current && JSON.stringify(previousQuery) !== JSON.stringify(queries) && selectedEntity?.length === 0) {
      fillOptions(queries);
    }
  }, [formData, defaultKind, defaultNamespace, typeToSearch, fillOptions, previousQuery, selectedEntity]);

  const allowArbitraryValues =
    uiSchema['ui:options']?.allowArbitraryValues ?? true;

  const getKeyFromGroupBy = useCallback((e: Entity): string => {
    if (groupBy) {
      return lodash.get(
        e,
        groupBy,
        lodash.get(e,
          'spec.lifecycle',
          'spec.type'
        ),
      ) as string;
    }
    return e.kind;
  }, [groupBy])

  const onType = useCallback(async (e: any) => {
    const value = e?.target?.value ?? "";
    if (value === "") return;
    if (typeToSearch) {
      await fillOptions(value.startsWith("regex:") || value.startsWith("filter:") ? undefined : value);
    }
    if (e.key === 'Enter') {
      try {
        let customFilterEntities: Entity[] | undefined = [];
        if (value.startsWith('regex:')) {
          customFilterEntities = entityOptions?.filter((entity: Entity) => entity.metadata?.name?.match(value.replace('regex:', '')))
        }
        if (value.startsWith('filter:') && value.includes('=')) {
          customFilterEntities = entityOptions?.filter((entity: Entity) => {
            const customFilter = value.replace('filter:', '').split('=')
            const result = lodash.get(entity, customFilter[0]) === customFilter[1]
            return result;
          })
        }
        if (!customFilterEntities) {
          return;
        }

        const entityRefs = customFilterEntities.map((entity: Entity) => realEntityName(entity.metadata?.name || '', entity.metadata?.namespace || ''));
        let distinctEntities = new Array(...new Set([...selectedEntity, ...entityRefs])); // avoid duplicated entities

        if (maxEntities && distinctEntities.length > Number(maxEntities)) {
          alertApi.post({
            message: `You can only select up to ${maxEntities} entities.`,
            severity: 'warning',
          });
          distinctEntities = distinctEntities.slice(0, Number(maxEntities));
        }

        setSelectedEntity(distinctEntities);
        onChange(distinctEntities);
      } catch (err) {
        // If the passed in value isn't an entity ref, do nothing.
      }
    }
  }, [typeToSearch, fillOptions, entityOptions, selectedEntity, onChange, maxEntities, alertApi]);

  const processStringRef = useCallback((r: string, selectedEntities: string[], changedEntities: string[]) => {
    let entityRef: string = r;
    if (entityRef === "") return;
    try {
      selectedEntities.push(r);
      const e = parseEntityRef(r, {
        defaultKind,
        defaultNamespace,
      });
      entityRef = realEntityName(e?.name || '', e?.namespace || '');
    } catch (err) {
      // If the passed in value isn't an entity ref, do nothing.
    }
    if (formData && !formData.find(e => e === r) || allowArbitraryValues) {
      changedEntities.push(entityRef);
    }
  }, [defaultKind, defaultNamespace, formData, allowArbitraryValues]);

  const processEntityRef = useCallback((r: string | Entity, selectedEntities: string[], changedEntities: string[]) => {
    if (typeof r !== 'string') {
      selectedEntities.push(humanizeEntityRef(r as Entity));
      changedEntities.push(realEntityName(
        r.metadata?.name || '',
        r.metadata?.namespace || '',
      ));
    } else {
      processStringRef(r, selectedEntities, changedEntities);
    }
  }, [processStringRef]);

  const onSelect = useCallback(
    (_evt: any, ref: (string | Entity)[], _reason?: AutocompleteChangeReason) => {
      const selectedEntities: string[] = [];
      const changedEntities: string[] = [];
      let maxReached = false;
      for (const r of ref) {
        if (maxEntities && selectedEntities.length >= Number(maxEntities)) {
          maxReached = true;
          break;
        }
        processEntityRef(r, selectedEntities, changedEntities);
      }

      if (maxReached) {
        alertApi.post({
          message: `You can only select up to ${maxEntities} entities.`,
          severity: 'warning',
        });
      }

      setSelectedEntity(selectedEntities);
      onChange(selectedEntities as string[])

      if (typeToSearch) setEntityOptions(undefined);
    },
    [onChange, processEntityRef, typeToSearch, maxEntities, alertApi],
  );

  const handleKeyDown = useCallback((event: any) => {
    if (!typeToSearch) {
      onType(event)
      return;
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    typingTimeoutRef.current = setTimeout(() => {
      onType(event);
    }, 400);
  }, [typeToSearch, onType]);

  // Since free solo can be enabled, attempt to parse as a full entity ref first, then fall
  // back to the given value.

  useEffect(() => {
    if (entityOptions?.length === 1 && selectedEntity.length > 0 && !typeToSearch) {
      onChange(entityOptions.map(e => stringifyEntityRef(e)));
    }
  }, [entityOptions, onChange, selectedEntity, typeToSearch]);


  const parseEntityRefWithDefaults = (
    entityRef: string,
    defaults: {
      kind: string,
      namespace: string
    }
  ): CompoundEntityRef => {
    const regex = /^(?:(?<kind>[^:]+):)?(?:(?<namespace>[^\/]+)\/)?(?<name>.+)$/;
    const match = entityRef.match(regex);

    if (match && match.groups) {
      const kind = match.groups.kind || defaults.kind;
      const namespace = match.groups.namespace || defaults.namespace || 'default';
      const name = match.groups.name;

      return {
        kind,
        namespace,
        name,
      };
    }

    throw new Error(`Invalid entity reference: ${entityRef}`);
  }

  useEffect(() => {
    if (!formData) return;
    let alternativeKind = 'Component';

    if (catalogFilter && Array.isArray(catalogFilter)) {
      alternativeKind = catalogFilter.find(e => e.kind)?.kind as string ?? alternativeKind;
    } else if (catalogFilter && catalogFilter.kind) {
      alternativeKind = catalogFilter.kind as string;
    }
    const result: (Entity | string)[] = []
    const entitySource = typeToSearch ? entityCache : entityOptions;
    for (const f of formData as string[]) {
      if (!f) continue;

      const entityRef: CompoundEntityRef = parseEntityRefWithDefaults(f, { kind: defaultKind ?? alternativeKind, namespace: defaultNamespace ?? 'default' })

      const entity = entitySource?.find(
        e => stringifyEntityRef(e) === stringifyEntityRef(entityRef),
      );

      if (entity || allowArbitraryValues) {
        result.push(entity ?? f)
      }
    }
    setSelectedEntity(result.map(e => typeof e === 'string' ? e : humanizeEntityRef(e as Entity)));
  }, [
    entityCache,
    entityOptions,
    defaultKind,
    catalogFilter,
    defaultNamespace,
    formData,
    allowArbitraryValues,
    typeToSearch,
  ]);

  return (
    <>
      <Tooltip
        id="copy-moonlight-token"
        title="Tip! You can select multiple entities by using a regex pattern or a specific entity field filter. Example: regex:.*-service or filter:spec.type=service"
        placement="bottom"
        open={tooltipOpen}
      >
        <FormControl
          margin="normal"
          required={required}
          error={rawErrors?.length > 0 && !formData}
          data-testid="entities-picker"
        >
          <Autocomplete
            multiple
            disabled={!typeToSearch && entityOptions?.length === 1}
            id={idSchema?.$id}
            value={selectedEntity}
            inputValue={inputValue}
            onInputChange={(e, value) => e && setInputValue(value)}
            groupBy={option => getKeyFromGroupBy(option)}
            loading={loading}
            noOptionsText={typeToSearch ? 'Type to Search' : noOptionsText ?? 'No Entity found'}
            onChange={onSelect}
            onMouseOver={() => tooltipEnabled && setTooltipOpen(true)}
            onMouseOut={() => tooltipEnabled && setTooltipOpen(false)}
            filterOptions={createFilterOptions({
              stringify: (option) => {
                let details = "";
                let label = "";
                if (useDescription) {
                  details = lodash.get(option, useDescription)
                }
                if (useLabel) {
                  label = lodash.get(option, useLabel)
                }
                return `${option.label ?? ''} ${option?.metadata?.name} ${label} ${details} ${option.spec?.github?.login ?? ''} ${option.spec?.profile?.displayName ?? ''} ${option.spec?.profile?.email ?? ''}`;
              },
            })}
            onKeyDown={handleKeyDown}
            options={([
              ...entityOptions ?? [],
              ...(entityCache?.filter(e => selectedEntity.includes(stringifyEntityRef(e)) ?? []))
            ].filter(e => !selectedEntity.includes(humanizeEntityRef(e)) && !selectedEntity.includes(realEntityName(e.metadata?.name || '', e.metadata?.namespace || ''))) || []).sort((a: Entity, b: Entity) => (a?.spec?.lifecycle as string ?? '').localeCompare(b?.spec?.lifecycle as string ?? ''))}
            getOptionLabel={option => {
              if (typeof option === 'string') {
                // @ts-ignore
                return entityLabels[option]?.label ?? option;
              }
              // @ts-ignore
              return entityLabels[stringifyEntityRef(option)]?.label;
            }}
            renderOption={(option: any) => {
              const fields = entityLabels[stringifyEntityRef(option)];
              return (
                <div data-testid={`option-${fields.label.replace(/[:/]/g, '-').toLocaleLowerCase()}`}>
                  {fields?.label}
                  {fields?.description && <Typography className={classes.label}>{fields?.description}</Typography>}
                </div>
              )
            }}
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
                required={required && selectedEntity.length === 0}
                InputProps={params.InputProps}
              />
            )}
          />
        </FormControl>
      </Tooltip>
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
