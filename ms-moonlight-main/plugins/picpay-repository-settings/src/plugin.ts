import { createPlugin } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayRepositorySettingsPlugin = createPlugin({
  id: 'picpay-repository-settings',
  routes: {
    root: rootRouteRef,
  },
});
