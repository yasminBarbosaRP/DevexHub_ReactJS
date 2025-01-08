/*
 * Copyright 2022 The Backstage Authors
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
  ConfigContent,
  ExternalDependenciesContent,
  InfoContent,
  DevToolsLayout
} from '@backstage/plugin-devtools';
import React from 'react';
import { UnprocessedEntitiesContent } from '@backstage/plugin-catalog-unprocessed-entities';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { NoPermissionImportPage } from '../importPage/NoPermissionImportPage';

const DevToolsPage = () => {
  const { show_info_backstage } = useHoustonContext();

  if (show_info_backstage === undefined) return null;

  return (
    show_info_backstage ? (
      <DevToolsLayout>
        <DevToolsLayout.Route path="info" title="Info">
          <InfoContent />
        </DevToolsLayout.Route>
        <DevToolsLayout.Route path="config" title="Config">
          <ConfigContent />
        </DevToolsLayout.Route>
        <DevToolsLayout.Route
          path="external-dependencies"
          title="External Dependencies"
        >
          <ExternalDependenciesContent />
        </DevToolsLayout.Route>
        <DevToolsLayout.Route
          path="unprocessed-entities"
          title="Unprocessed Entities"
        >
          <UnprocessedEntitiesContent />
        </DevToolsLayout.Route>
      </DevToolsLayout>
    ) : <NoPermissionImportPage />
  );
};

export const customDevToolsPage = <DevToolsPage />;
