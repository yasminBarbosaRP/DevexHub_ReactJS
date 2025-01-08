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

import Box from '@material-ui/core/Box';
import Info from '@material-ui/icons/Info';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import React, { useContext } from 'react';
import ReactMarkdown from 'react-markdown';
import { TemplateContext } from '@internal/plugin-picpay-commons';

/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */
export interface StepInfoUiOptions {
  text?: string;
  showIcon?: boolean;
  link?: {
    text: string;
    url: string;
  };
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const StepInfo = (
  props: FieldExtensionComponentProps<string, StepInfoUiOptions>,
) => {
  const { uiSchema } = props;
  const showIcon = uiSchema['ui:options']?.showIcon ?? true;
  const showBorder = uiSchema['ui:options']?.showBorder ?? true;
  const markdown = uiSchema['ui:options']?.markdown ?? false;
  const text = uiSchema['ui:options']?.text;
  const link = uiSchema['ui:options']?.link;
  const { extractIdentityValue } = useContext(TemplateContext);

  return (
    <Box component="span" sx={showBorder ? { m: 1, p: 1.2, border: '1px dashed grey' } : {}}>
      <h4>
        {showIcon && <Info style={{ marginRight: '.5em' }} />}
        {markdown ?  <ReactMarkdown>{extractIdentityValue(text ?? "")}</ReactMarkdown> : extractIdentityValue(text ?? "")?.split('<br>').map(i => (
          <>
            {i}
            <br />
          </>
        ))}
        {link && (
          <>
            {' '}
            <u>
              <a href={link.url} target="_blank">
                {extractIdentityValue(link.text)}
              </a>
            </u>
          </>
        )}
      </h4>
    </Box>
  );
};
