import { IArgoCDRepository } from '@internal/plugin-picpay-argocd-backend';
import { ClusterIdentifierIntermediator } from './ClusterIdentifierIntermediator';
import { Logger } from 'winston';
import { ConfigApi } from '@backstage/core-plugin-api';
import { ConfigReader } from '@backstage/config';
import { Entity, RELATION_OWNED_BY } from '@backstage/catalog-model';
import { ValidationError } from '../types/error';
import crossFetch from 'cross-fetch';

jest.mock('cross-fetch', () => {
  return {
    __esModule: true,
    default: jest.fn(),
  };
});

describe('testing getDeployFrequency', () => {
  let logger: jest.Mocked<Logger>;
  let repo: jest.Mocked<IArgoCDRepository>;
  let config: ConfigApi;

  beforeEach(() => {
    logger = {
      warn: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
    } as unknown as jest.Mocked<Logger>;
    repo = {
      GetApplicationClusters: jest.fn(),
      GetClusters: jest.fn(),
    };
    config = new ConfigReader({
      backend: {
        baseUrl: 'http://localhost:7000',
      },
    });
  });

  test('throw ValidationError due invalid metadata.annotation source', async () => {
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'moonlight.picpay/cluster-hom': 'eks-applfm-use1-hom',
          'moonlight.picpay/cluster-prd': 'eks-applfm-use1-prd',
        },
      },
      spec: {
        owner: 'guest',
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
          target: {
            kind: 'user',
            name: 'guest',
            namespace: 'default',
          },
        },
      ],
    };
    let err: ValidationError | undefined;
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        jest.fn(),
      );
    } catch (exception: any) {
      err = exception;
    }

    expect(err?.message).toBe(
      'annotation backstage.io/source-location not found for software',
    );
  });

  test('kind is diff than component', async () => {
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity = {
      apiVersion: 'v1',
      kind: 'Resource',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'moonlight.picpay/cluster-hom': 'eks-applfm-use1-hom',
          'moonlight.picpay/cluster-prd': 'eks-applfm-use1-prd',
        },
      },
      spec: {
        owner: 'guest',
        type: 'eks',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
          target: {
            kind: 'user',
            name: 'guest',
            namespace: 'default',
          },
        },
      ],
    };

    let err: ValidationError | undefined;
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        jest.fn(),
      );
    } catch (exception: any) {
      err = exception;
    }

    expect(err).toBe(undefined);
    expect(logger.debug).toHaveBeenCalledWith(
      `no conditions met to identify cluster info for entity ${entity.metadata.name}`,
    );
  });

  test('throw err when source-location is not from github', async () => {
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'moonlight.picpay/cluster-hom': 'eks-applfm-use1-hom',
          'moonlight.picpay/cluster-prd': 'eks-applfm-use1-prd',
          'backstage.io/source-location': 'www.picpay.com',
        },
      },
      spec: {
        owner: 'guest',
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
          target: {
            kind: 'user',
            name: 'guest',
            namespace: 'default',
          },
        },
      ],
    };

    let err: ValidationError | undefined;
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        jest.fn(),
      );
    } catch (exception: any) {
      err = exception;
    }

    expect(err?.message).toBe(
      `annotation backstage.io/source-location not found for ${entity.metadata.name} despite annotation is there`,
    );
  });

  test('no cluster found', async () => {
    // @ts-ignore
    crossFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      status: 200,
    });
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'backstage.io/source-location':
            'url:https://github.com/PicPay/ms-software/tree/main/catalog-info.yaml',
        },
      },
      spec: {
        owner: 'guest',
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
          target: {
            kind: 'user',
            name: 'guest',
            namespace: 'default',
          },
        },
      ],
    };

    repo.GetApplicationClusters.mockImplementationOnce(() =>
      Promise.resolve([]),
    );
    let err: ValidationError | undefined;
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        jest.fn(),
      );
    } catch (exception: any) {
      err = exception;
    }

    expect(err).toBe(undefined);
    expect(logger.debug).toHaveBeenCalledWith(
      `no cluster found for entity ${entity.metadata.name}`,
    );
  });

  test('fetch returned not ok', async () => {
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'backstage.io/source-location':
            'url:https://github.com/PicPay/ms-software/tree/main/catalog-info.yaml',
        },
      },
      spec: {
        owner: 'guest',
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
        },
      ],
    };
    // @ts-ignore
    crossFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve([]),
      text: () => Promise.resolve('[]'),
      status: 200,
    });

    repo.GetApplicationClusters.mockImplementationOnce(() =>
      Promise.resolve([
        {
          app: 'software',
          cluster: 'eks-applfm-use1-hom',
          environment: 'hom',
        },
      ]),
    );
    let err: ValidationError | undefined;
    const _emit = jest.fn();
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        _emit,
      );
    } catch (exception: any) {
      err = exception;
    }
    // expect(getMock).toHaveBeenCalledTimes(1);
    expect(err).toBe(undefined);
    expect(logger.warn).toHaveBeenCalledWith(
      `unable to find cluster relations for ${entity.metadata.name} using cluster eks-applfm-use1-hom, perhaps this cluster is not in the catalog`,
    );
    expect(
      (entity.metadata.annotations ?? {})['moonlight.picpay/cluster-hom'],
    ).toBe('eks-applfm-use1-hom');
    expect(_emit).not.toHaveBeenCalled();
  });

  test('fetch returned ok and emit is called 2 times', async () => {

    // @ts-ignore
    crossFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve([
          {
            metadata: {
              namespace: 'default',
              annotations: {
                'backstage.io/managed-by-location':
                  'url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/catalog-info.yaml',
                'backstage.io/managed-by-origin-location':
                  'url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/blob/main/catalog-info.yaml',
                'backstage.io/view-url':
                  'https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/catalog-info.yaml',
                'backstage.io/edit-url':
                  'https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/edit/main/catalog-info.yaml',
                'backstage.io/source-location':
                  'url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/',
                'backstage.io/kubernetes-id': 'eks-applfm-use1-hom',
                'github.com/project-slug':
                  'PicPay/stack-terraform-eks-applfm-ck-hom',
              },
              name: 'eks-applfm-use1-hom',
              tags: ['eks'],
              description: 'Cluster do ambiente eks-applfm-use1-hom\n',
              links: [
                {
                  url: 'https://picpay.atlassian.net/wiki/spaces/IC/pages/2386133007/Manifesto+Kubernetes+de+Boas+Pr+ticas+para+Deployments+de+Alta+Disponibilidade',
                  title:
                    'Manifesto Kubernetes de Boas Práticas para Deployments de Alta Disponibilidade',
                  icon: 'dashboard',
                },
              ],
              labels: {
                'moonlight.picpay/aws-account': 'techcross-qa.404187436949',
                'moonlight.picpay/maintainer': 'developer-tools',
                'moonlight.picpay/short-name': 'applfm',
                'moonlight.picpay/vault-role': 'kubernetes-applfm-use1-hom',
              },
              uid: 'd6a89306-04d6-438a-bbbf-3b3a7f8ace35',
              etag: '3b99f7ef55dd7abb4a361e0ffeab674fc17ca429',
            },
            apiVersion: 'backstage.io/v1alpha1',
            kind: 'Resource',
            spec: {
              lifecycle: 'experimental',
              owner: 'tech_cross',
              type: 'eks',
            },
          },
        ]),
      text: () =>
        Promise.resolve(
          '[{"metadata": {"namespace": "default","annotations": {"backstage.io/managed-by-location": "url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/catalog-info.yaml","backstage.io/managed-by-origin-location": "url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/blob/main/catalog-info.yaml","backstage.io/view-url": "https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/catalog-info.yaml","backstage.io/edit-url": "https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/edit/main/catalog-info.yaml","backstage.io/source-location": "url:https://github.com/PicPay/stack-terraform-eks-applfm-ck-hom/tree/main/","backstage.io/kubernetes-id": "eks-applfm-use1-hom","github.com/project-slug": "PicPay/stack-terraform-eks-applfm-ck-hom"},"name": "eks-applfm-use1-hom","tags": ["eks"],"description": "Cluster do ambiente eks-applfm-use1-hom\n","links": [{"url": "https://picpay.atlassian.net/wiki/spaces/IC/pages/2386133007/Manifesto+Kubernetes+de+Boas+Pr+ticas+para+Deployments+de+Alta+Disponibilidade","title": "Manifesto Kubernetes de Boas Práticas para Deployments de Alta Disponibilidade","icon": "dashboard"}],"labels": {"moonlight.picpay/aws-account": "techcross-qa.404187436949","moonlight.picpay/maintainer": "developer-tools","moonlight.picpay/short-name": "applfm","moonlight.picpay/vault-role": "kubernetes-applfm-use1-hom"},"uid": "d6a89306-04d6-438a-bbbf-3b3a7f8ace35","etag": "3b99f7ef55dd7abb4a361e0ffeab674fc17ca429"},"apiVersion": "backstage.io/v1alpha1","kind": "Resource","spec": {"lifecycle": "experimental","owner": "tech_cross","type": "eks"}}]',
        ),
      status: 200,
    });
    
    const intermediator = await ClusterIdentifierIntermediator.init(
      logger,
      repo,
      config,
    );
    const entity: Entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'backstage.io/source-location':
            'url:https://github.com/PicPay/ms-software/tree/main/catalog-info.yaml',
        },
      },
      spec: {
        owner: 'guest',
        type: 'service',
        lifecycle: 'production',
      },
      relations: [
        {
          type: RELATION_OWNED_BY,
          targetRef: 'user:default/guest',
        },
      ],
    };

    repo.GetApplicationClusters.mockImplementationOnce(() =>
      Promise.resolve([
        {
          app: 'software',
          cluster: 'eks-applfm-use1-hom',
          environment: 'hom',
        },
      ]),
    );
    let err: ValidationError | undefined;
    const _emit = jest.fn();
    try {
      if (!intermediator.postHandle)
        throw new Error('postHandle is not defined');
      await intermediator.postHandle(
        entity,
        { type: 'url', target: 'http://localhost:7000' },
        _emit,
      );
    } catch (exception: any) {
      err = exception;
    }

    expect(err).toBe(undefined);
    expect(logger.debug).toHaveBeenCalledWith(
      `clusters successfully included for entity ${
        entity.metadata.name
      }, relations:${JSON.stringify(entity.relations)}`,
    );
    expect(
      (entity.metadata.annotations ?? {})['moonlight.picpay/cluster-hom'],
    ).toBe('eks-applfm-use1-hom');
    expect(_emit).toHaveBeenCalledTimes(2);
  });
});
