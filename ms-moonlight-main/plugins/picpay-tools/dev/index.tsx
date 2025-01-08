import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayToolsPlugin, PicpayToolsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayToolsPlugin)
  .addPage({
    element: <PicpayToolsPage />,
    title: 'Root Page',
    path: '/picpay-tools',
  })
  .render();
