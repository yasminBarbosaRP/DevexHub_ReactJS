import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { npsPlugin } from '../src';

createDevApp()
  .registerPlugin(npsPlugin)
  .addPage({
    element: <div />,
    title: 'Root Page',
    path: '/nps',
  })
  .render();
