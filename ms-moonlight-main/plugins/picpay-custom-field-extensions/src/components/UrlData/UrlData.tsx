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
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import FormControl from '@material-ui/core/FormControl';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { TextField } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import lodash from 'lodash';
import { usePrevious } from 'react-use';
import { TemplateContext } from '@internal/plugin-picpay-commons';

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

export interface RequestInfo {
  endpoint: string;
  method: string;
  body: { [k: string]: any };
  headers: { [k: string]: any };
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const UrlDataPicker = (
  props: FieldExtensionComponentProps<string>,
) => {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState([]);
  const [requestInfo, setRequestInfo] = useState<RequestInfo>();
  const { onChange, required, uiSchema, schema: { title = 'Entity', description = 'An entity from the catalog' }, rawErrors, formData, idSchema } = props;
  const { extractIdentityValue, loading: identityIsLoading } = useContext(TemplateContext);
  const previous = usePrevious(requestInfo);
  const alertApi = useApi(alertApiRef);

  const key = (uiSchema['ui:options']?.key as string) ?? "";
  const fieldList = (uiSchema['ui:options']?.fieldList as string) ?? "";
  const endpoint = (uiSchema['ui:options']?.endpoint as string) ?? "";
  const method = (uiSchema['ui:options']?.method as string) ?? "GET";
  const body = useMemo(() => uiSchema['ui:options']?.body as { [k: string]: any } ?? {}, [uiSchema]);
  const headers = useMemo(() => uiSchema['ui:options']?.headers as { [k: string]: string } ?? {}, [uiSchema]);

  const fetchOptions = useCallback(async (req: RequestInfo) => {
    if (!req) return;
    setLoading(true);
    try {
      const response = await fetch(req.endpoint, {
        method: req.method,
        headers: req.headers ?? {},
        body: req.method.toLowerCase() !== "get" && req.body ? JSON.stringify(req.body) : undefined,
      });
      if (!response.ok) {
        throw new Error(`Error fetching data: ${response.statusText}`);
      }

      const jsonResponse = await response.json();
      let data = []
      if (fieldList) {
        data = jsonResponse[fieldList]
      } else {
        data = jsonResponse
      }
      const fetchedOptions = data.map((item: any) => lodash.get(item, key)).filter((item: any) => item);
      setOptions(fetchedOptions);
    } catch (error) {
      alertApi.post({ message: (error as Error).message, severity: 'error' });
    } finally {
      setLoading(false);
    }
  }, [key, alertApi, fieldList]);

  useEffect(() => {
    if (identityIsLoading) return;
    const request = {
      endpoint,
      method,
      body,
      headers,
    } as RequestInfo;
    if (headers) {
      Object.keys(headers).forEach((k: string) => {
        request.headers[k] = extractIdentityValue(headers[k]);
      });
    }
    if (body) {
      Object.keys(body).forEach((k: string) => {
        request.body[k] = extractIdentityValue(body[k]);
      });
    }
    request.endpoint = extractIdentityValue(endpoint)

    if (uiSchema && JSON.stringify(previous) === JSON.stringify(request)) return;
    setRequestInfo(request);
    fetchOptions(request);
  }, [identityIsLoading, fetchOptions, endpoint, method, body, headers, extractIdentityValue, uiSchema, previous]);

  return (
    <>
      <FormControl
        margin="normal"
        required={required}
        error={rawErrors?.length > 0 && !formData}
      >
        <Autocomplete
          id={idSchema?.$id}
          data-testid="info"
          value={formData}
          noOptionsText={props.noOptionsText || 'No info available'}
          loading={loading}
          onChange={(_, e) => onChange(e ?? "")}
          options={options}
          autoSelect
          freeSolo={false}
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
