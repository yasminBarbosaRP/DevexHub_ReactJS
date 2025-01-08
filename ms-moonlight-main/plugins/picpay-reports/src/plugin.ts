import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const reportsPlugin = createPlugin({
  id: 'reports',
  routes: {
    root: rootRouteRef,
  },
});

export const ReportsPage = reportsPlugin.provide(
  createRoutableExtension({
    name: 'ReportsPage',
    component: () => import('./components/report').then(m => m.ReportPage),
    mountPoint: rootRouteRef,
  }),
);
