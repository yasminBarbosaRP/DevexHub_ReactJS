import React from 'react';
import { EntityEnvironment } from './EntityEnvironment';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { RELATION_OWNED_BY } from '@backstage/catalog-model';
import { screen } from '@testing-library/react';
import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
} from '@backstage/integration-react';
import {
  catalogApiRef,
  EntityProvider,
  CatalogApi,
  entityRouteRef,
} from '@backstage/plugin-catalog-react';
import { ConfigReader } from '@backstage/core-app-api';


describe('BitriseArtifactsComponent', () => {
  const catalogApi: jest.Mocked<CatalogApi> = {
    getLocationById: jest.fn(),
    getEntityByName: jest.fn(),
    getEntities: jest.fn(),
    addLocation: jest.fn(),
    getLocationByRef: jest.fn(),
    removeEntityByUid: jest.fn(),
    refreshEntity: jest.fn(),
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('show message when entity has no environments found', async () => {
    const entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
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

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            scmIntegrationsApiRef,
            ScmIntegrationsApi.fromConfig(
              new ConfigReader({
                integrations: {},
              }),
            ),
          ],
          [catalogApiRef, catalogApi],
        ]}
      >
        <EntityProvider entity={entity}>
          <EntityEnvironment />
        </EntityProvider>
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
      },
    );

    expect(
      await screen.findByText('No Environments Found for this Component!'),
    ).toBeInTheDocument();
  });

  it('show only homolog environment', async () => {
    const entity = {
      apiVersion: 'v1',
      kind: 'Component',
      metadata: {
        name: 'software',
        description: 'This is the description',
        annotations: {
          'moonlight.picpay/cluster-hom': 'eks-applfm-use1-hom',
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

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            scmIntegrationsApiRef,
            ScmIntegrationsApi.fromConfig(
              new ConfigReader({
                integrations: {},
              }),
            ),
          ],
          [catalogApiRef, catalogApi],
        ]}
      >
        <EntityProvider entity={entity}>
          <EntityEnvironment />
        </EntityProvider>
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
      },
    );

    expect(await screen.findByText('eks-applfm-use1-hom')).toBeInTheDocument();
    expect(await screen.findByText('homolog')).toBeInTheDocument();
    expect(await screen.queryByText('production')).toBeNull();
    expect(await screen.queryByText('eks-applfm-use1-prd')).toBeNull();
  });

  it('show both homolog and production', async () => {
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

    await renderInTestApp(
      <TestApiProvider
        apis={[
          [
            scmIntegrationsApiRef,
            ScmIntegrationsApi.fromConfig(
              new ConfigReader({
                integrations: {},
              }),
            ),
          ],
          [catalogApiRef, catalogApi],
        ]}
      >
        <EntityProvider entity={entity}>
          <EntityEnvironment />
        </EntityProvider>
      </TestApiProvider>,
      {
        mountedRoutes: {
          '/catalog/:namespace/:kind/:name': entityRouteRef,
        },
      },
    );

    expect(await screen.findByText('eks-applfm-use1-hom')).toBeInTheDocument();
    expect(await screen.findByText('homolog')).toBeInTheDocument();
    expect(await screen.queryByText('production')).toBeInTheDocument();
    expect(await screen.queryByText('eks-applfm-use1-prd')).toBeInTheDocument();
  });
});
