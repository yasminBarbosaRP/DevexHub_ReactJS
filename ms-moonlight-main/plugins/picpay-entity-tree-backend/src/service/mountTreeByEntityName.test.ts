import {
  CatalogRequestOptions,
  GetEntitiesRequest,
  GetEntitiesResponse,
} from '@backstage/catalog-client';

import mountTreeByEntityName from './mountTreeByEntityName';

describe('mountTreeByEntityName', () => {
  beforeAll(async () => { });

  describe('mount tree', () => {
    it('returns ok', async () => {
      const catalogApi = {
        getEntities(
          _request?: GetEntitiesRequest,
          _options?: CatalogRequestOptions,
        ): Promise<GetEntitiesResponse> {
          return Promise.resolve({ items: [] });
        },
      } as any;

      const catalogApiSpy = jest.spyOn(catalogApi, 'getEntities');

      catalogApiSpy
        .mockReturnValue(null)
        .mockReturnValueOnce(
          Promise.resolve({
            items: [
              {
                metadata: {
                  namespace: 'default',
                  name: 'ms-test',
                  labels: {
                    'moonlight.picpay/framework': 'nodejs',
                    'moonlight.picpay/language': 'typescript',
                  },
                  annotations: {
                    'moonlight.picpay/cluster-hom': 'cluster-hom',
                    'moonlight.picpay/cluster-prd': 'cluster-prd',
                  },
                  tags: ['tag1', 'tag2'],
                },
                kind: 'Group',
                spec: {
                  type: 'service',
                  owner: 'owner',
                  lifecycle: 'lifecycle',
                },
                relations: [
                  {
                    type: 'ownerOf',
                    target: { namespace: 'default', name: 'ms-service-1' },
                  },
                  {
                    type: 'childOf',
                    target: { namespace: 'default', name: 'business_unit' },
                  },
                  {
                    type: 'ownerOf',
                    target: { namespace: 'default', name: 'ms-service-3' },
                  },
                ],
              },
            ],
          }),
        )
        .mockReturnValueOnce(
          Promise.resolve({
            items: [
              {
                metadata: { namespace: 'default', name: 'business_unit' },
                kind: 'Group',
                spec: { type: 'business-unit' },
                relations: [],
              },
            ],
          }),
        );

      const result = await mountTreeByEntityName(catalogApi, 'ms-test', 'default');

      expect(catalogApiSpy).toHaveBeenCalled();
      expect(result).toEqual({
        name: 'ms-test',
        namespace: 'default',
        kind: 'Group',
        type: 'service',
        owner: 'owner',
        framework: 'nodejs',
        language: 'typescript',
        lifecycle: 'lifecycle',
        clusterHom: 'cluster-hom',
        clusterPrd: 'cluster-prd',
        tags: ['tag1', 'tag2'],
        parents: [
          {
            name: 'business_unit',
            namespace: 'default',
            kind: 'Group',
            type: 'business-unit',
            parents: [],
          },
        ],
      });
    });
  });
});
