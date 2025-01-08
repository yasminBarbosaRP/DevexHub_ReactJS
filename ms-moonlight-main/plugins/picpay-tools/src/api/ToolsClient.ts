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

import { DiscoveryApi, FetchApi } from '@backstage/core-plugin-api';
import { ResponseError } from '@backstage/errors';
import { GetExploreToolsRequest } from '@backstage-community/plugin-explore-common';
import { ToolsApi } from './ToolsApi';
import {
  CustomExploreTool,
  CustomGetExploreToolsResponse,
} from '@internal/plugin-picpay-tools-backend';

interface CustomExploreToolsConfig {
  getTools: () => Promise<CustomExploreTool[]>;
}

export class ToolsClient implements ToolsApi {
  private readonly discoveryApi: DiscoveryApi;
  private readonly fetchApi: FetchApi;
  private readonly customExploreToolsConfig:
    | CustomExploreToolsConfig
    | undefined;

  constructor(options: {
    discoveryApi: DiscoveryApi;
    fetchApi: FetchApi;
    customExploreToolsConfig?: CustomExploreToolsConfig;
  }) {
    this.discoveryApi = options.discoveryApi;
    this.fetchApi = options.fetchApi;
    this.customExploreToolsConfig = options.customExploreToolsConfig;
  }

  async getTools(
    request: GetExploreToolsRequest = {},
  ): Promise<CustomGetExploreToolsResponse> {
    if (this.customExploreToolsConfig) {
      const tools = await this.customExploreToolsConfig.getTools();
      if (tools) {
        return { tools };
      }
    }

    const { fetch } = this.fetchApi;

    const filter = request.filter ?? {};
    const baseUrl = await this.discoveryApi.getBaseUrl('tools');

    const tags = filter?.tags?.map(t => `tag=${encodeURIComponent(t)}`) ?? [];
    const lifecycles =
      filter?.lifecycle?.map(l => `lifecycle=${encodeURIComponent(l)}`) ?? [];
    const query = [...tags, ...lifecycles].join('&');

    const response = await fetch(`${baseUrl}?${query}`);

    if (!response.ok) {
      throw await ResponseError.fromResponse(response);
    }

    return response.json() as Promise<CustomGetExploreToolsResponse>;
  }
}
