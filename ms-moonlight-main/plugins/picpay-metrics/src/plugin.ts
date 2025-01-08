import {
  createComponentExtension,
  createPlugin,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayMetricsPlugin = createPlugin({
  id: 'picpay-metrics',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayMetrics = picpayMetricsPlugin.provide(
  createComponentExtension({
    component: {
      lazy: () => import('./components/Metrics').then(m => m.Metrics),
    },
  })
);
