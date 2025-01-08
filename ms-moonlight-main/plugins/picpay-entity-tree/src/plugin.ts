import { createPlugin } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayEntityTreePlugin = createPlugin({
  id: 'picpay-entity-tree',
  routes: {
    root: rootRouteRef,
  },
});
