import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayEntityCardsPlugin = createPlugin({
  id: 'picpay-entity-cards',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayEntityCardsPage = picpayEntityCardsPlugin.provide(
  createRoutableExtension({
    name: 'PicpayEntityCardsPage',
    component: () =>
      import('./components/ExampleComponent').then(m => m.ExampleComponent),
    mountPoint: rootRouteRef,
  }),
);
