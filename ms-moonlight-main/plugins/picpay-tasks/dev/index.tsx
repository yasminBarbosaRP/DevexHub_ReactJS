import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayTasksPlugin, PicpayTasksPage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayTasksPlugin)
  .addPage({
    element: <PicpayTasksPage />,
    title: 'Root Page',
    path: '/picpay-tasks'
  })
  .render();
