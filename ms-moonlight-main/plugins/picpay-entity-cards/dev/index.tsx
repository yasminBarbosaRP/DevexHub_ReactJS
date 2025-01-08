import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayEntityCardsPlugin, PicpayEntityCardsPage } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayEntityCardsPlugin)
  .addPage({
    element: <PicpayEntityCardsPage />,
    title: 'Root Page',
    path: '/picpay-entity-cards',
  })
  .render();
