import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayCommonsPlugin } from '../src/plugin';
import { Playground } from './Playground';

createDevApp()
  .registerPlugin(picpayCommonsPlugin)
  .addPage({
    element: <Playground />,
    title: 'Root Page',
    path: '/picpay-commons',
  })
  .render();
