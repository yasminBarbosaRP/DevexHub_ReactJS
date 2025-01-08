import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayHomePlugin, PicpayHomePage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayHomePlugin)
  .addPage({
    element: <PicpayHomePage />,
    title: 'Root Page',
    path: '/home',
  })
  .render();
