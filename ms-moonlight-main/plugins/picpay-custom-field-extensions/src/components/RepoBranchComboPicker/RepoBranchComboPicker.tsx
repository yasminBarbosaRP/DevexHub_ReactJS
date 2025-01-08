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
import React, { useCallback, useEffect, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { TextField } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import { githubApiRef } from '@internal/plugin-picpay-github';

/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */

export interface RepoBranchPickerUiOptions {
  repositories: string[];
  allowArbitraryValues?: boolean;
}

export interface RepoBranchInfo {
  repository: string;
  branch: string;
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const RepoBranchComboPicker = (
  props: FieldExtensionComponentProps<RepoBranchInfo>,
) => {
  const { onChange, required, uiSchema, rawErrors, formData, idSchema } = props;

  const githubApi = useApi(githubApiRef);
  const alertApi = useApi(alertApiRef);

  const repositories = (uiSchema['ui:options']?.repositories as string[]) ?? [];
  const allowArbitraryValues =
    (uiSchema['ui:options']?.allowArbitraryValues as boolean) ?? true;

  const [branches, setBranchs] = useState<string[]>([]);
  const [loadingRepositories] = useState<boolean>(false);
  const [loadingBranches, setLoadingBranches] = useState<boolean>(false);

  const onSelect = useCallback(
    (_: any, value?: string | null): any => {
      setBranchs([]);
      onChange({ branch: '', repository: value || '' });
    },
    [onChange],
  );

  const onSelectBranch = useCallback(
    (_: any, value?: string | null): any => {
      onChange({ ...formData ?? {}, branch: value || '', repository: formData?.repository || '' });
    },
    [onChange, formData],
  );

  const updateBranchList = useCallback(async () => {
    try {
      setLoadingBranches(true);
      const repoBranches = await githubApi.getBranches(
        props.formData?.repository || '',
      );
      setBranchs(repoBranches.map(el => el.name));
    } catch (err) {
      if ((err as Error).message.includes('Not Found')) {
        alertApi.post({
          message: 'Repository was not found',
          severity: 'error',
        });
        return;
      }
      alertApi.post({ message: (err as Error).message, severity: 'error' });
    } finally {
      setLoadingBranches(false);
    }
  }, [
    props.formData?.repository,
    setLoadingBranches,
    githubApi,
    alertApi,
    setBranchs,
  ]);

  useEffect(() => {
    if (!props.formData?.repository) return;

    updateBranchList();
  }, [props.formData?.repository, updateBranchList]);

  return (
    <>
      <FormControl
        margin="normal"
        required={required}
        error={rawErrors?.length > 0 && !formData}
      >
        <Autocomplete
          id={idSchema?.$id}
          data-testid="repository"
          value={formData?.repository ?? ''}
          noOptionsText={props.noOptionsText || 'No Repository available'}
          loading={loadingRepositories}
          onChange={onSelect}
          options={repositories}
          autoSelect
          freeSolo={allowArbitraryValues}
          renderInput={params => (
            <TextField
              {...params}
              label="Repository"
              margin="dense"
              helperText="Github Repository name"
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

        <Autocomplete
          id={`${idSchema?.$id}-branches`}
          data-testid="branches"
          value={formData?.branch ?? ''}
          noOptionsText={props.noOptionsText || 'No Branches available'}
          loading={loadingBranches}
          onChange={onSelectBranch}
          options={branches}
          autoSelect
          freeSolo={false}
          renderInput={params => (
            <TextField
              {...params}
              label="Branch"
              margin="dense"
              helperText="Branch"
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
