// @ts-nocheck
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import {
  ApiDefinitionWidget,
  OpenApiDefinitionWidget,
  defaultDefinitionWidgets,
} from '@backstage/plugin-api-docs';
import React from 'react';

export default class ApiDocs {
  /**
   *
   */
  constructor(
    readonly configApi: ConfigApi,
    readonly identityApi: IdentityApi,
  ) { }

  getApiDocsConfig() {
    const requestInterceptor = async (req: any) => {
      const { token } = await this.identityApi.getCredentials();
      const url = this.configApi.getString('backend.baseUrl');

      if (req.body && req.body.get && (req.body.get("file") || req.body.get("files"))) {
        req.headers = { 'Content-Type': `multipart/form-data` };
        req.body.append('url', req.url)
        req.body.append('headers', JSON.stringify(req.headers))
        req.body.append('body', JSON.stringify(req.body))
        req.body.append('method', req.method)
        req.body.append('credentials', req.credentials)
      } else {
        req.body = JSON.stringify(req);
        req.headers['Content-Type'] = 'application/json';
      }

      req.url = `${url}/api/api-docs-proxy`;
      req.headers.Authorization = `Bearer ${token}`;
      req.method = 'POST';
      return req;
    };
    const widgets = defaultDefinitionWidgets();
    const definitionWidgets: ApiDefinitionWidget[] = widgets.map(
      (obj: ApiDefinitionWidget) => {
        if (obj.type === 'openapi') {
          return {
            ...obj,
            component: (definition: string): React.ReactElement => (
              <OpenApiDefinitionWidget
                definition={definition}
                requestInterceptor={requestInterceptor}
              />
            ),
          };
        }
        return obj;
      },
    );
    return {
      getApiDefinitionWidget: (apiEntity: any) => {
        return definitionWidgets.find(
          (d: any) => d.type === apiEntity.spec.type,
        );
      },
      // Return an object of type ApiDocsConfig
      apiDocsConfig: {
        definitionWidgets,
        requestInterceptor,
      },
    };
  }
}
