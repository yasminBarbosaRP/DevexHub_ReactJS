import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayToolsPlugin = createPlugin({
  id: 'picpay-tools',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayToolsPage = picpayToolsPlugin.provide(
  createRoutableExtension({
    name: 'PicpayToolsPage',
    component: () => import('./components/Tools').then(m => m.ToolsComponent),
    mountPoint: rootRouteRef,
  }),
);
