// @ts-nocheck

/**
 * @jest-environment jsdom
 */

import { EntityFilterQuery } from '@backstage/catalog-client';
import { Entity } from '@backstage/catalog-model';
import { CatalogApi, catalogApiRef } from '@backstage/plugin-catalog-react';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { FieldProps } from '@rjsf/utils';
import { fireEvent } from '@testing-library/react';
import React from 'react';
import { ComponentPicker } from './ComponentPicker';
import { AdditionalInformationApiClient, additionalInformationApiRef } from '@internal/plugin-picpay-commons';

const makeEntity = (kind: string, namespace: string, name: string): Entity => ({
  apiVersion: 'backstage.io/v1beta1',
  kind,
  metadata: { namespace, name },
});

describe('<ComponentPicker />', () => {
  let entities: Entity[];
  const onChange = jest.fn();
  const onChangeWithEntity = jest.fn();

  const schema = {};
  const required = false;
  let uiSchema: {
    'ui:options': {
      allowedKinds?: string[];
      allowedTypes?: string[];
      defaultKind?: string;
      allowArbitraryValues?: boolean;
      defaultNamespace?: string | false;
      catalogFilter?: EntityFilterQuery;
      useLabel?: string;
      useValue?: string;
      group?: {
        key: string;
        explicitly: boolean;
      };
    };
  };
  const rawErrors: string[] = [];
  const formData = undefined;

  let props: FieldProps;

  const catalogApi: jest.Mocked<CatalogApi> = {
    getLocationById: jest.fn(),
    getEntityByName: jest.fn(),
    queryEntities: jest.fn(async () => ({ items: entities })),
    addLocation: jest.fn(),
    getLocationByRef: jest.fn(),
    removeEntityByUid: jest.fn(),
  } as any;
  let Wrapper: React.ComponentType;


  const additionalInformationApi: jest.Mocked<AdditionalInformationApiClient> = {
    getByEntityRef: jest.fn()
  } as any;


  beforeEach(() => {
    entities = [
      makeEntity('Group', 'default', 'team-a'),
      makeEntity('Group', 'default', 'squad-b'),
    ];

    Wrapper = ({ children }: { children?: React.ReactNode }) => (
      <TestApiProvider apis={[[catalogApiRef, catalogApi], [additionalInformationApiRef, additionalInformationApi]]}>
        {children}
      </TestApiProvider>
    );
  });

  afterEach(() => jest.resetAllMocks());

  describe('without allowedKinds and catalogFilter', () => {
    beforeEach(() => {
      uiSchema = { 'ui:options': {} };
      props = {
        onChange,
        onChangeWithEntity,
        schema,
        required,
        uiSchema,
        rawErrors,
        formData,
      } as unknown as FieldProps<any>;

      catalogApi.queryEntities.mockResolvedValue({ items: entities, pageInfo: { nextCursor: null} });
    });

    it('searches for all entities', async () => {
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      expect(catalogApi.queryEntities).toHaveBeenCalledTimes(0);
    });

    it('updates only on select', async () => {
      const { getByRole } = await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      const input = getByRole('textbox');

      fireEvent.change(input, {
        target: { value: { id: 'squ', label: 'Squad' } },
      });
      fireEvent.blur(input);

      expect(onChangeWithEntity).toHaveBeenCalledWith(
        '[object Object]',
        undefined,
        undefined,
      );
    });
  });

  describe('with allowedKinds', () => {
    beforeEach(() => {
      uiSchema = { 'ui:options': { allowedKinds: ['User'] } };
      props = {
        onChange,
        schema,
        required,
        uiSchema,
        rawErrors,
        formData,
      } as unknown as FieldProps<any>;

      catalogApi.queryEntities.mockResolvedValue({ items: entities, pageInfo: { nextCursor: null} });
    });

    it('searches for users and groups', async () => {
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      expect(catalogApi.queryEntities).toHaveBeenCalledWith({
        filter: {
          kind: ['User'],
        },

        fields: [
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'kind',
          'spec',
          'metadata.name',
          'metadata.title',
          'metadata.description',
          'spec.profile.displayname',
          'spec.profile.email',
          'spec.github.login',
          'spec.type',
          'spec.lifecycle',
        ],
        limit: 1000,
        cursor: undefined,
        fullTextFilter: undefined,
      });
    });
  });

  describe('with catalogFilter', () => {
    beforeEach(() => {
      uiSchema = {
        'ui:options': {
          catalogFilter: [
            {
              kind: ['Group'],
              'metadata.name': 'test-entity',
            },
            {
              kind: ['User'],
              'metadata.name': 'test-entity',
            },
          ],
        },
      };
      props = {
        onChange,
        schema,
        required,
        uiSchema,
        rawErrors,
        formData,
      } as unknown as FieldProps<any>;

      catalogApi.queryEntities.mockResolvedValue({ items: entities, pageInfo: { nextCursor: null} });
    });

    it('searches for a specific group entity', async () => {
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      expect(catalogApi.queryEntities).toHaveBeenCalledWith({
        filter: [
          {
            kind: ['Group'],
            'metadata.name': 'test-entity',
          },
          {
            kind: ['User'],
            'metadata.name': 'test-entity',
          },
        ],
        fields: [
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'kind',
          'spec',
          'metadata.name',
          'metadata.title',
          'metadata.description',
          'spec.profile.displayname',
          'spec.profile.email',
          'spec.github.login',
          'spec.type',
          'spec.lifecycle',
        ],
        limit: 1000,
        cursor: undefined,
        fullTextFilter: undefined,
      });
    });
  });

  describe('catalogFilter should take precedence over allowedKinds', () => {
    beforeEach(() => {
      uiSchema = {
        'ui:options': {
          catalogFilter: [
            {
              kind: ['Group'],
              'metadata.name': 'test-group',
            },
          ],
          allowedKinds: ['User'],
        },
      };
      props = {
        onChange,
        schema,
        required,
        uiSchema,
        rawErrors,
        formData,
      } as unknown as FieldProps<any>;

      catalogApi.queryEntities.mockResolvedValue({ items: entities, pageInfo: { nextCursor: null} });
    });

    it('searches for a Group entity', async () => {
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      expect(catalogApi.queryEntities).toHaveBeenCalledWith({
        filter: [
          {
            kind: ['Group'],
            'metadata.name': 'test-group',
          },
        ],

        fields: [
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'kind',
          'spec',
          'metadata.name',
          'metadata.title',
          'metadata.description',
          'spec.profile.displayname',
          'spec.profile.email',
          'spec.github.login',
          'spec.type',
          'spec.lifecycle',
        ],
        limit: 1000,
        cursor: undefined,
        fullTextFilter: undefined,
      });
    });
  });

  describe('if catalogFilter is not present use allowed filters', () => {
    beforeEach(() => {
      uiSchema = {
        'ui:options': {
          allowedKinds: ['User'],
          useLabel: 'test',
          useValue: 'test',
        },
      };
      props = {
        onChange,
        schema,
        required,
        uiSchema,
        rawErrors,
        formData,
      } as unknown as FieldProps<any>;

      catalogApi.queryEntities.mockResolvedValue({ items: entities, pageInfo: { nextCursor: null} });
    });

    it('searches for a User Kind', async () => {
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );

      expect(catalogApi.queryEntities).toHaveBeenCalledWith({
        filter: {
          kind: ['User'],
        },
        fields: [
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'kind',
          'spec',
          'metadata.name',
          'metadata.title',
          'metadata.description',
          'spec.profile.displayname',
          'spec.profile.email',
          'spec.github.login',
          'spec.type',
          'spec.lifecycle',
        ],
        limit: 1000,
        cursor: undefined,
        fullTextFilter: undefined,
      });
    });

    it('searches for a User Kind and Type', async () => {
      uiSchema = {
        'ui:options': {
          allowedKinds: ['User'],
          allowedTypes: ['team'],
        },
      };
      props = { ...props, uiSchema };
      await renderInTestApp(
        <Wrapper>
          <ComponentPicker {...props} />
        </Wrapper>,
      );
      expect(catalogApi.queryEntities).toHaveBeenCalledWith({
        filter: {
          kind: ['User'],
          'spec.type': ['team'],
        },
        fields: [
          'metadata.name',
          'metadata.namespace',
          'metadata.title',
          'kind',
          'spec',
          'metadata.name',
          'metadata.title',
          'metadata.description',
          'spec.profile.displayname',
          'spec.profile.email',
          'spec.github.login',
          'spec.type',
          'spec.lifecycle',
        ],
        limit: 1000,
        cursor: undefined,
        fullTextFilter: undefined,
      });
    });
  });
});
