import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpaySanctuary2Plugin } from '../src/plugin';
import { ManagementPage } from '../src';

createDevApp()
  .registerPlugin(picpaySanctuary2Plugin)
  .addPage({
    element: <ManagementPage />,
    title: 'Root Page',
    path: '/picpay-sanctuary2',
  })
  .render();
