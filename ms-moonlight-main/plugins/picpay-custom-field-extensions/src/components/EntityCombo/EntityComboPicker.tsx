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
import React from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { EntityPickerUiOptions } from '@backstage/plugin-scaffolder';
import { EntityPicker } from './EntityPicker/EntityPicker';
/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */
export type CustomEntityPickerUiOptions = EntityPickerUiOptions & {
  nextFilterKey: string;
  description?: string;
  title?: string;
  useLabel?: string;
  noOptionsText?: string;
};
export interface EntityComboPickerUiOptions {
  [field: string]: CustomEntityPickerUiOptions;
}

export interface Result {
  [k: string]: string;
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const EntityComboPicker = (
  props: FieldExtensionComponentProps<Result, EntityComboPickerUiOptions>,
) => {
  const { onChange, uiSchema, formData = {} } = props;

  const fields = Object.keys(uiSchema['ui:options'] || {});

  if (fields.length === 0 || fields.length === 1)
    return <>Invalid Configuration for EntityComboPicker</>;
  return (
    <>
      {fields.map((field: string, i: number) => {
        if (!uiSchema['ui:options'] || !uiSchema['ui:options'][field])
          return null;
        const item: CustomEntityPickerUiOptions = uiSchema['ui:options'][field];
        const nextFilter: Record<string, string> =
          i > 0
            ? {
                [uiSchema['ui:options'][fields[i - 1]]?.nextFilterKey]:
                  formData[fields[i - 1]],
              }
            : {};

        for (const k of Object.keys(nextFilter)) {
          if (!item.catalogFilter) item.catalogFilter = {};
          if (Array.isArray(item.catalogFilter)) {
            item.catalogFilter[0][k] = nextFilter[k] as string;
          } else if (typeof item.catalogFilter === 'object') {
            item.catalogFilter[k] = nextFilter[k];
          } else {
            item.catalogFilter = nextFilter;
          }
        }
        return (
          <>
            {/* @ts-ignore */}
            <EntityPicker
              {...props}
              useLabel={item.useLabel || ''}
              noOptionsText={item.noOptionsText || 'No options found'}
              formData={formData[field]}
              schema={{
                description: item.description,
                title: item.title,
              }}
              key={field}
              onChange={(e: any) => {
                const updatedFormData = { ...formData, [field]: e };

                for (let j = i + 1; j < fields.length; j++) {
                  updatedFormData[fields[j]] = '';
                }

                onChange(updatedFormData);
              }}
              uiSchema={{
                'ui:options': {
                  defaultNamespace: item.defaultNamespace,
                  allowArbitraryValues: item.allowArbitraryValues ?? false,
                  defaultKind: item.defaultKind,
                  allowedKinds: item.allowedKinds,
                  catalogFilter: item.catalogFilter,
                } as EntityPickerUiOptions,
              }}
            />
          </>
        );
      })}
    </>
  );
};
