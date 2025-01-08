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
import React, { useCallback, useContext, useEffect, useState } from 'react';
import { useApi } from '@backstage/core-plugin-api';
import {
  catalogApiRef,
  humanizeEntityRef,
} from '@backstage/plugin-catalog-react';

import { Entity } from '@backstage/catalog-model';
import { TextField } from '@material-ui/core';
import FormControl from '@material-ui/core/FormControl';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { Alert } from '@material-ui/lab';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { GetEntitiesResponse, GetEntitiesRequest } from '@backstage/catalog-client';
import { useHasChanged } from '../hooks';
import { TemplateContext } from '@internal/plugin-picpay-commons';

/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */
export interface ClusterPickerUiOptions {
  allowedKinds?: string[];
  defaultKind?: string;
  allowedTypes?: string[];
  allowedOwners?: string[];
  groupBy?: GroupBy;
  allowArbitraryValues?: boolean;
  defaultNamespace?: string | false;
}

export interface GroupBy {
  type: string;
  values: {
    key: string;
    alias: string;
  }[];
}

export interface EntityInfo {
  [key: string]: Entity;
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const ClusterPicker = (
  props: FieldExtensionComponentProps<EntityInfo, ClusterPickerUiOptions>,
) => {
  const {
    onChange,
    schema: { title = 'Entity', description = 'An entity from the catalog' },
    required,
    uiSchema,
    rawErrors,
    formData,
    idSchema,
    enabled = true,
    enforceAllowedOwners = false,
  } = props;

  const allowedKinds = uiSchema['ui:options']?.allowedKinds;
  const allowedTypes = uiSchema['ui:options']?.allowedTypes as string[];
  const allowedOwners = uiSchema['ui:options']?.allowedOwners as string[];
  const defaultKind = uiSchema['ui:options']?.defaultKind;
  const groupBy = uiSchema['ui:options']?.groupBy;
  const ignoreEntities = uiSchema['ui:options']?.ignoreEntities as string;
  const defaultNamespace = uiSchema['ui:options']?.defaultNamespace;

  const [entities, setEntities] = useState<GetEntitiesResponse | undefined>(
    undefined,
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [entityRefs, setEntityRefs] = useState<EntityInfo[]>([]);
  const allowedOwnersHasChanged = useHasChanged(allowedOwners);
  const catalogApi = useApi(catalogApiRef);
  const [onlyHomolog, setOnlyHomolog] = useState<boolean>(false);
  const { loading: isLoading, extractIdentityValue } = useContext(TemplateContext);

  const onSelect = useCallback(
    (
      _: unknown,
      value: { [key: string]: Entity } | string | null | undefined,
    ) => {
      // @ts-ignore
      onChange(value ?? undefined);

      if (value && typeof value !== 'string') {
        setOnlyHomolog(value?.homolog && !value?.production);
      } else {
        setOnlyHomolog(false);
      }
    },
    [onChange, setOnlyHomolog],
  );

  const ensureImportantKeysAreFilled = useCallback(() => {
    if (!formData) return;

    const keys = Object.keys(formData);
    if (!keys.length) return;

    keys.forEach(key => {
      if (formData[key].kind !== '') {
        return;
      }

      entityRefs.forEach(ref => {
        if (!ref[key]) {
          return;
        }

        if (ref[key].metadata.name === formData[key].metadata.name) {
          onSelect(undefined, ref);
          return;
        }
      });
    });
  }, [formData, entityRefs, onSelect]);

  const refreshEntities = useCallback(() => {
    let owners: string[] = [];

    if (enforceAllowedOwners && (!allowedOwners || allowedOwners.length === 0))
      return;
    if (
      allowedOwners &&
      allowedOwners.length === 1 &&
      allowedOwners[0] === undefined
    ) {
      return;
    }

    setLoading(true);

    if (allowedOwners && allowedOwners.length > 0) {
      owners = allowedOwners.map(e => e?.replace(/_-/g, '_'));
    }

    let request: GetEntitiesRequest | undefined;
    if (allowedKinds && allowedTypes && allowedOwners) {
      request = {
        filter: {
          kind: allowedKinds,
          'spec.type': allowedTypes,
          'spec.owner': owners,
        },
      };
    } else if (allowedKinds) {
      request = { filter: { kind: allowedKinds } };
    } else if (allowedTypes) {
      request = { filter: { 'spec.type': allowedTypes } };
    } else if (allowedOwners) {
      request = { filter: { 'spec.owner': owners } };
    }

    catalogApi
      .getEntities(request)
      .then(value => setEntities(value))
      .finally(() => setLoading(false));
  }, [
    allowedOwners,
    allowedKinds,
    allowedTypes,
    catalogApi,
    enforceAllowedOwners,
  ]);

  useEffect(() => {
    if (!allowedOwnersHasChanged || isLoading) return;
    onSelect(undefined, undefined);
    refreshEntities();
  }, [allowedOwners, allowedOwnersHasChanged, onSelect, refreshEntities, isLoading]);

  useEffect(() => {
    ensureImportantKeysAreFilled();
  }, [formData, entityRefs, ensureImportantKeysAreFilled]);

  useEffect(() => {
    if (entityRefs?.length === 1) {
      onChange(entityRefs[0]);
    }
  }, [entityRefs, onChange]);

  const getGroupAndFixedName = useCallback(
    (entityName: string) => {
      if (!groupBy || !groupBy.values) return {};
      for (const group of groupBy.values) {
        if (groupBy.type === 'suffix' && entityName?.endsWith(group.key)) {
          return {
            groupAlias: group.alias,
            fixedName: entityName.split(group.key)[0],
          };
        } else if (
          groupBy.type === 'prefix' &&
          entityName?.startsWith(group.key)
        ) {
          return {
            groupAlias: group.alias,
            fixedName: entityName.split(group.key)[1],
          };
        }
      }
      return {};
    },
    [groupBy],
  );

  useEffect(() => {
    type group = {
      [key: string]: EntityInfo;
    };

    const items = entities?.items ?? [];

    const groupRefs = (!ignoreEntities ? items : items.filter(e => extractIdentityValue(ignoreEntities, false, { entity: e }) !== "true")).reduce<group>((result, e) => {
      const entityName = humanizeEntityRef(e, {
        defaultKind,
        defaultNamespace,
      });

      const { groupAlias, fixedName } = getGroupAndFixedName(entityName);

      if (groupAlias && fixedName) {
        if (!result[fixedName]) {
          result[fixedName] = {};
        }

        result[fixedName][groupAlias] = e;
      }

      return result;
    }, {});

    setEntityRefs(
      Object.keys(groupRefs)
        .filter(key => Object.keys(groupRefs[key]).length > 0)
        .map(key => groupRefs[key]),
    );
  }, [
    entities,
    defaultKind,
    defaultNamespace,
    getGroupAndFixedName,
    groupBy?.values,
    ignoreEntities,
    extractIdentityValue,
  ]);

  return (
    <>
      <FormControl
        margin="normal"
        required={required}
        error={rawErrors?.length > 0 && !formData}
      >
        <Autocomplete
          disabled={!enabled}
          id={idSchema?.$id}
          value={formData}
          noOptionsText={props.noOptionsText || 'No Cluster found'}
          loading={loading}
          onChange={onSelect}
          options={entityRefs || {}}
          getOptionLabel={option => {
            const clusters = Object.keys(option);
            if (clusters.length > 0) {
              const { fixedName } = getGroupAndFixedName(
                option[clusters[0]].metadata.name,
              );
              return `${fixedName} [${clusters.join(', ')}]`;
            }
            return '';
          }}
          autoSelect
          freeSolo={uiSchema['ui:options']?.allowArbitraryValues ?? true}
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
      {onlyHomolog && (
        <Alert
          variant="filled"
          style={{ width: '100%', justifyContent: 'center' }}
          severity="warning"
        >
          This cluster does not have a production instance, remember to do the
          process to create the production resources later.
        </Alert>
      )}
    </>
  );
};
