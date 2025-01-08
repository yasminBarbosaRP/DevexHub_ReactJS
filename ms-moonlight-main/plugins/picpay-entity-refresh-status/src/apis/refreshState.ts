import { ConfigApi, createApiRef } from '@backstage/core-plugin-api';

export type RefreshState = {
  getEntityRefreshState(
    entityRef: string,
    order: string,
    limit: number,
  ): Promise<RefreshState[]>;
  forceRefresh(
    name: string,
    kind: string,
    namespace: string,
    intervalSeconds: number,
  ): Promise<any[]>;
};

export const refreshStateApiRef = createApiRef<RefreshState>({
  id: 'entity-refresh-state',
});

export class EntityRefreshState {
  private readonly backendUrl: string;
  constructor(config: ConfigApi) {
    this.backendUrl = config.getString('backend.baseUrl');
  }

  async getEntityRefreshState(
    entityRef: string = '',
    order: string = 'asc',
    limit: number = 10,
  ): Promise<RefreshState[]> {
    const response = await fetch(
      `${this.backendUrl}/api/catalog/entities/refresh-state?entity_ref=${entityRef}&order=${order}&limit=${limit}`,
      {
        method: 'GET',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
    );

    return await response.json();
  }

  async forceRefresh(
    name: string,
    kind: string,
    namespace: string = 'default',
    intervalSeconds: number = 1,
  ): Promise<any[]> {
    const response = await fetch(
      `${this.backendUrl}/api/catalog/entities/refresh-state/force/${kind}/${namespace || 'default'
      }/${name}`,
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ seconds: intervalSeconds }),
      },
    );

    return await response.json();
  }
}
