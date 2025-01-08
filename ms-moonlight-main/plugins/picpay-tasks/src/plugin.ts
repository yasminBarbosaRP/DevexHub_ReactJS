import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayTasksPlugin = createPlugin({
  id: 'picpay-tasks',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayTasksPage = picpayTasksPlugin.provide(
  createRoutableExtension({
    name: 'PicpayTasksPage',
    component: () =>
      import('./components/EntityTasks/EntityTasks').then(m => m.EntityTasks),
    mountPoint: rootRouteRef,
  }),
);
