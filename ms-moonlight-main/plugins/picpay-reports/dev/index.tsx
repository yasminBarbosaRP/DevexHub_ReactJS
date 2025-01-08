import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { reportsPlugin, ReportsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(reportsPlugin)
  .addPage({
    element: <ReportsPage />,
    title: 'Root Page',
    path: '/reports',
  })
  .render();
