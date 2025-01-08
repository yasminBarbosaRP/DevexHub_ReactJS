import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const picpaySanctuary2Plugin = createPlugin({
  id: 'picpay-sanctuary2',
  routes: {
    root: rootRouteRef,
  },
});

export const Sanctuary2Page = picpaySanctuary2Plugin.provide(
  createRoutableExtension({
    name: 'Sanctuary2Page',
    component: () =>
      import('./components/ManagementPage').then(m => m.ManagementPage),
    mountPoint: rootRouteRef,
  }),
);
