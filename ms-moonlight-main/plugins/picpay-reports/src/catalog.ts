import { createApiRef, ConfigApi } from '@backstage/core-plugin-api';
import { Entity } from '@backstage/catalog-model';

type CatalogReport = {
  getCatalogComponent(): Promise<Entity>;
};

type Options = {
  configApi: ConfigApi;
};

export const CatalogReportApiRef = createApiRef<CatalogReport>({
  id: 'catalog-report-api',
});

export class CatalogReportClient implements CatalogReport {
  configApi: ConfigApi;

  constructor(options: Options) {
    this.configApi = options.configApi;
  }

  private async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
    const url = this.configApi.getString('backend.baseUrl');
    const response = await fetch(`${url}${input}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      ...init,
    });

    if (!response.ok) {
      throw new Error(
        response.statusText ||
          'Catalog Component Report - An unexpected error occurred.',
      );
    }

    return await response.json();
  }

  async getCatalogComponent(): Promise<Entity> {
    const response = await this.fetch<Entity>(
      '/api/catalog/entities?filter=kind=component&filter=kind=group,spec.type=business-unit',
    );
    return response;
  }
}
