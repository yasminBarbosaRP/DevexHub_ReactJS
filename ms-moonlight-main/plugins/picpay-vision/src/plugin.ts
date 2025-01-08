import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayVisionPlugin = createPlugin({
  id: 'picpay-vision',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayVisionPage = picpayVisionPlugin.provide(
  createRoutableExtension({
    name: 'PicpayVisionPage',
    component: () =>
      import('./components/catalog/VisionCatalogContentComponent').then(
        m => m.VisionCatalogContent,
      ),
    mountPoint: rootRouteRef,
  }),
);
