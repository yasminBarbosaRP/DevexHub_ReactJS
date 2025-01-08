import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const HistoryPlugin = createPlugin({
  id: 'history',
  routes: {
    root: rootRouteRef,
  },
});

export const HistoryPage = HistoryPlugin.provide(
  createRoutableExtension({
    name: 'HistoryPage',
    component: () =>
      import('./components/HistoryComponent').then(m => m.HistoryComponent),
    mountPoint: rootRouteRef,
  }),
);
