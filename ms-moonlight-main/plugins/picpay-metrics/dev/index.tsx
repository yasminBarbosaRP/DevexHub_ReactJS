import React from 'react';
import { createDevApp } from '@backstage/dev-utils';
import { picpayMetricsPlugin, PicpayMetrics } from '../src/plugin';

createDevApp()
  .registerPlugin(picpayMetricsPlugin)
  .addPage({
    element: <PicpayMetrics source="SERVICE" />,
    title: 'Root Page',
    path: '/picpay-metrics',
  })
  .render();
