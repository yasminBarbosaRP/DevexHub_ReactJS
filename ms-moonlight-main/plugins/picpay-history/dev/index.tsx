import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { HistoryPlugin, HistoryPage } from '../src/plugin';

createDevApp()
  .registerPlugin(HistoryPlugin)
  .addPage({
    element: <HistoryPage />,
    title: 'Root Page',
    path: '/history',
  })
  .render();
