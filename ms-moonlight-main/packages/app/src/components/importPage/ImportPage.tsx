import React from 'react';
import { DefaultImportPage } from '@backstage/plugin-catalog-import';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { NoPermissionImportPage } from './NoPermissionImportPage';

const ImportPage = () => {
  const { show_register_component_page } = useHoustonContext();

  if (show_register_component_page === undefined) return null;

  if (show_register_component_page) {
    return <DefaultImportPage />;
  }

  return <NoPermissionImportPage />;
};

export const importPage = <ImportPage />;
