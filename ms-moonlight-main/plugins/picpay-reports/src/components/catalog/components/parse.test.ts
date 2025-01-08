import { parseCatalogComponent } from './parse';

describe('parseCatalogComponent', () => {
  it('should return an array when components are provided', () => {
    const components = [
      {
        kind: 'Component',
        metadata: {
          name: 'Test',
          description: 'Test',
          tags: ['test1', 'test2', 'test3'],
          annotations: {
            'moonlight.picpay/cluster-prd': 'test',
            'moonlight.picpay/cluster-hom': 'test',
            'github.com/repository-id': 'test',
            'github.com/repository-created-at': 'test',
          },
          labels: {
            'moonlight.picpay/language': 'test',
            'moonlight.picpay/framework': 'test',
          },
        },
        spec: {
          owner: 'Test',
          lifecycle: 'Test',
        },
      },
    ];
    const result = parseCatalogComponent(components);
    expect(result).toEqual([
      {
        ms: 'Test',
        description: 'Test',
        bu: '',
        owner: 'Test',
        language: 'test',
        framework: 'test',
        tags: 'test1, test2, test3',
        lifecycle: 'Test',
        cluster_prd: 'test',
        cluster_hom: 'test',
        repository_id: 'test',
        repository_created_at: 'test',
      },
    ]);
  });
  it('should return an empty array when kind is not Component', () => {
    const components = [
      {
        kind: 'NotComponent',
        metadata: {
          name: 'Test',
          description: 'Test',
          tags: ['test1', 'test2', 'test3'],
          annotations: {
            'moonlight.picpay/cluster-prd': 'test',
            'moonlight.picpay/cluster-hom': 'test',
            'github.com/repository-id': 'test',
            'github.com/repository-created-at': 'test',
          },
          labels: {
            'moonlight.picpay/language': 'test',
            'moonlight.picpay/framework': 'test',
          },
        },
        spec: {
          owner: 'Test',
          lifecycle: 'Test',
        },
      },
    ];
    const result = parseCatalogComponent(components);
    expect(result).toEqual([]);
  });
  it('should return an empty array when only exists BU component', () => {
    const components = [
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          annotations: {
            'backstage.io/managed-by-location': 'test',
          },
          name: 'test-bu',
          description: 'bu-test',
        },
        spec: {
          profile: {
            displayName: 'test-bu',
          },
          type: 'business-unit',
          parent: 'picpay',
          squadSre: 'squad-sre-test',
          children: ['children1', 'children2'],
        },
        relations: [
          {
            type: 'childOf',
            targetRef: 'group:default/picpay',
            target: {
              kind: 'group',
              namespace: 'default',
              name: 'picpay',
            },
          },
          {
            type: 'ownerOf',
            targetRef: 'resource:default/eks-store1-use1-hom',
            target: {
              kind: 'resource',
              namespace: 'default',
              name: 'eks-store1-use1-hom',
            },
          },
          {
            type: 'ownerOf',
            targetRef: 'resource:default/eks-store1-use1-prd',
            target: {
              kind: 'resource',
              namespace: 'default',
              name: 'eks-store1-use1-prd',
            },
          },
          {
            type: 'parentOf',
            targetRef: 'resource:default/parent-of',
            target: {
              kind: 'resource',
              namespace: 'default',
              name: 'parent-test',
            },
          },
        ],
      },
    ];

    const result = parseCatalogComponent(components);
    expect(result).toEqual([]);
  });
  it('should return an empty array when bu has squad', () => {
    const components = [
      {
        kind: 'Component',
        metadata: {
          name: 'Test',
          description: 'Test',
          tags: ['test1', 'test2', 'test3'],
          annotations: {
            'moonlight.picpay/cluster-prd': 'test',
            'moonlight.picpay/cluster-hom': 'test',
            'github.com/repository-id': 'test',
            'github.com/repository-created-at': 'test',
          },
          labels: {
            'moonlight.picpay/language': 'test',
            'moonlight.picpay/framework': 'test',
          },
        },
        spec: {
          owner: 'test-squad',
          lifecycle: 'Test',
        },
      },
      {
        apiVersion: 'backstage.io/v1alpha1',
        kind: 'Group',
        metadata: {
          annotations: {
            'backstage.io/managed-by-location': 'test',
          },
          name: 'test-bu',
          description: 'bu-test',
        },
        spec: {
          profile: {
            displayName: 'test-bu',
          },
          type: 'business-unit',
          parent: 'picpay',
          squadSre: 'squad-sre-test',
          children: ['children1', 'children2'],
        },
        relations: [
          {
            type: 'childOf',
            targetRef: 'group:default/picpay',
            target: {
              kind: 'group',
              namespace: 'default',
              name: 'picpay',
            },
          },
          {
            type: 'ownerOf',
            targetRef: 'resource:default/eks-store1-use1-hom',
            target: {
              kind: 'resource',
              namespace: 'default',
              name: 'eks-store1-use1-hom',
            },
          },
          {
            type: 'ownerOf',
            targetRef: 'resource:default/eks-store1-use1-prd',
            target: {
              kind: 'resource',
              namespace: 'default',
              name: 'eks-store1-use1-prd',
            },
          },
          {
            type: 'parentOf',
            targetRef: 'group:default/test-squad',
            target: {
              kind: 'group',
              namespace: 'default',
              name: 'test-squad',
            },
          },
        ],
      },
    ];

    const result = parseCatalogComponent(components);
    expect(result).toEqual([
      {
        ms: 'Test',
        description: 'Test',
        bu: 'test-bu',
        owner: 'test-squad',
        language: 'test',
        framework: 'test',
        tags: 'test1, test2, test3',
        lifecycle: 'Test',
        cluster_prd: 'test',
        cluster_hom: 'test',
        repository_id: 'test',
        repository_created_at: 'test',
      },
    ]);
  });
});
