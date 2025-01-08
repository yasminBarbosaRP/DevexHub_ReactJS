import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const picpayHomePlugin = createPlugin({
  id: 'picpay-home',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayHomePage = picpayHomePlugin.provide(
  createRoutableExtension({
    name: 'PicpayHomePage',
    component: () => import('./components/HomePage').then(m => m.HomePage),
    mountPoint: rootRouteRef,
  }),
);
