/*
 * Copyright 2021 The Backstage Authors
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
  Content,
  ContentHeader,
  CreateButton,
  PageWithHeader,
  SupportButton,
  TableColumn,
  TableProps,
} from '@backstage/core-components';
import { configApiRef, useApi, useRouteRef } from '@backstage/core-plugin-api';
import {
  CatalogFilterLayout,
  EntityLifecyclePicker,
  EntityListProvider,
  EntityProcessingStatusPicker,
  EntityOwnerPicker,
  EntityTagPicker,
  EntityTypePicker,
  UserListPicker,
  EntityKindPicker,
  EntityNamespacePicker,
  useEntityList,
  EntityRefLinks,
} from '@backstage/plugin-catalog-react';
import React, { ReactNode, useMemo } from 'react';
import { createComponentRouteRef } from '../routes';
import {
  CatalogTable,
  CatalogTableRow,
  CatalogTableColumnsFunc,
  DefaultCatalogPageProps,
} from '@backstage/plugin-catalog';
import { useOutlet } from 'react-router';
import { Entity } from '@backstage/catalog-model';
import { ANNOTATION_CLUSTER_HOM, ANNOTATION_CLUSTER_PRD } from './Environments';
import {
  createTranslationRef,
  useTranslationRef,
} from '@backstage/core-plugin-api/alpha';

const catalogTranslationRef = createTranslationRef({
  id: 'catalog',
  messages: {
    catalog_page_title: `{{orgName}} Catalog`,
    catalog_page_create_button_title: 'Create',
  },
});
/**
 * Props for root catalog pages.
 *
 * @public
 */

const createEnvironmentColumn = (): TableColumn<CatalogTableRow> => {
  const formatContent = (entity: Entity): string => {
    if (!entity || !entity.metadata || !entity.metadata.annotations) return '';
    if (
      entity.metadata.annotations &&
      entity.metadata.annotations[ANNOTATION_CLUSTER_HOM] &&
      entity.metadata.annotations[ANNOTATION_CLUSTER_PRD]
    ) {
      return `${entity.metadata.annotations[ANNOTATION_CLUSTER_HOM]} ${entity.metadata.annotations[ANNOTATION_CLUSTER_PRD]}`;
    }

    if (
      entity.metadata.annotations &&
      entity.metadata.annotations[ANNOTATION_CLUSTER_HOM]
    ) {
      return entity.metadata.annotations[ANNOTATION_CLUSTER_HOM];
    }

    if (
      entity.metadata.annotations &&
      entity.metadata.annotations[ANNOTATION_CLUSTER_PRD]
    ) {
      return entity.metadata.annotations[ANNOTATION_CLUSTER_PRD];
    }
    return '';
  };
  return {
    title: 'Environments',
    field: 'entity.metadata.annotations.moonlight.picpay/cluster-prd',
    sorting: true,
    customFilterAndSearch: (query: any, row: CatalogTableRow, _: any) =>
      formatContent(row.entity)
        .toLocaleUpperCase('en-US')
        .includes(query.toLocaleUpperCase('en-US')),
    customSort: ({ entity: entity1 }, { entity: entity2 }) =>
      formatContent(entity1).localeCompare(formatContent(entity2)),
    render: ({ entity }) => {
      return (
        <>
          {entity?.kind.toLocaleLowerCase('en-US') === 'component' &&
            entity.metadata.annotations && (
              <>
                {entity.metadata.annotations[ANNOTATION_CLUSTER_HOM] && (
                  <EntityRefLinks
                    entityRefs={[`resource:default/${entity.metadata.annotations[ANNOTATION_CLUSTER_HOM]}`]}
                    defaultKind="Resource"
                  />
                )}
                {entity.metadata.annotations[ANNOTATION_CLUSTER_PRD] && (
                  <EntityRefLinks
                    entityRefs={[`resource:default/${entity.metadata.annotations[ANNOTATION_CLUSTER_PRD]}`]}
                    defaultKind="Resource"
                  />
                )}
              </>
            )}
        </>
      );
    },
  };
};

export function CustomCatalogTable(props: {
  columns: TableColumn<CatalogTableRow>[] | CatalogTableColumnsFunc | undefined;
  actions: TableProps<CatalogTableRow>['actions'];
  tableOptions: TableProps<CatalogTableRow>['options'];
  emptyContent: ReactNode;
}) {
  const { filters } = useEntityList();

  const defaultColumns: TableColumn<CatalogTableRow>[] = useMemo(() => {
    return [
      CatalogTable.columns.createTitleColumn({ hidden: true }),
      CatalogTable.columns.createNameColumn({
        defaultKind: filters.kind?.value,
      }),
      ...createEntitySpecificColumns(),
      CatalogTable.columns.createMetadataDescriptionColumn(),
      CatalogTable.columns.createTagsColumn(),
    ];

    function createEntitySpecificColumns(): TableColumn<CatalogTableRow>[] {
      const baseColumns = [CatalogTable.columns.createOwnerColumn()];
      switch (filters.kind?.value) {
        case 'user':
          return [];
        case 'domain':
        case 'system':
          return [CatalogTable.columns.createOwnerColumn()];
        case 'group':
        case 'template':
          return [CatalogTable.columns.createSpecTypeColumn()];
        case 'location':
          return [
            CatalogTable.columns.createSpecTypeColumn(),
            CatalogTable.columns.createSpecTargetsColumn(),
          ];
        default:
          return [...baseColumns, createEnvironmentColumn()];
      }
    }
  }, [filters.kind?.value]);

  return (
    <CatalogTable
      columns={props.columns ?? defaultColumns}
      actions={props.actions}
      tableOptions={props.tableOptions}
      emptyContent={props.emptyContent}
    />
  );
}

export function CustomCatalogPage(props: DefaultCatalogPageProps) {
  const {
    columns,
    actions,
    initiallySelectedFilter = 'owned',
    initialKind = 'component',
    tableOptions = {},
    emptyContent,
    pagination,
  } = props;
  const orgName =
    useApi(configApiRef).getOptionalString('organization.name') ?? 'Backstage';
  const createComponentLink = useRouteRef(createComponentRouteRef);
  const { t } = useTranslationRef(catalogTranslationRef);

  // TODO: Remove this hack when the catalog is refactored to use the new
  React.useEffect(() => {
    const buttons = document.querySelectorAll('nav .search-icon');
    if (!buttons.length) return;

    const search = (buttons[0].cloneNode(true) as HTMLElement);

    search.classList.forEach(c => {
      if (c.startsWith('BackstageSidebarItem')) {
        search.classList.remove(c)
      };
    });

    search.style.width = '224px';

    document
      .querySelectorAll('.custom-catalog-table > div > div > table+div')
      .forEach(e => {
        const el = e.children.item(2);
        if (!el) return;

        (e as HTMLElement).style.padding = '0';

        el.innerHTML = '';
        el.appendChild(search);

        search.addEventListener('click', () => {
          (buttons[0] as HTMLElement).click();
        });
      });
  }, []);

  return (
    <PageWithHeader title={`${orgName} Catalog`} themeId="home">
      <Content>
        <ContentHeader title="">
          <CreateButton
            title={t('catalog_page_create_button_title')}
            to={createComponentLink && createComponentLink()}
          />
          <SupportButton>All your software catalog entities</SupportButton>
        </ContentHeader>
        <EntityListProvider pagination={pagination}>
          <CatalogFilterLayout>
            <CatalogFilterLayout.Filters>
              <EntityKindPicker initialFilter={initialKind} />
              <EntityTypePicker />
              <UserListPicker initialFilter={initiallySelectedFilter} />
              <EntityOwnerPicker />
              <EntityLifecyclePicker />
              <EntityTagPicker />
              <EntityProcessingStatusPicker />
              <EntityNamespacePicker />
            </CatalogFilterLayout.Filters>
            <CatalogFilterLayout.Content>
              <div className="custom-catalog-table">
                <CustomCatalogTable
                  columns={columns}
                  actions={actions}
                  tableOptions={tableOptions}
                  emptyContent={emptyContent}
                />
              </div>
            </CatalogFilterLayout.Content>
          </CatalogFilterLayout>
        </EntityListProvider>
      </Content>
    </PageWithHeader>
  );
}

export function CatalogPage(props: DefaultCatalogPageProps) {
  const outlet = useOutlet();

  return outlet ?? <CustomCatalogPage {...props} />;
}
