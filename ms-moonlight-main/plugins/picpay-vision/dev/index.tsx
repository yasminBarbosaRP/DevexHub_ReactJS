import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayVisionPlugin, PicpayVisionPage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayVisionPlugin)
  .addPage({
    element: <PicpayVisionPage />,
    title: 'Root Page',
    path: '/picpay-vision',
  })
  .render();
