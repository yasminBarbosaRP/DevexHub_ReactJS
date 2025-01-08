import {
  createPlugin,
  createRoutableExtension,
} from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const picpayPipelineRunPlugin = createPlugin({
  id: 'picpay-pipeline-run',
  routes: {
    root: rootRouteRef,
  },
});

export const PicpayPipelineRunPage = picpayPipelineRunPlugin.provide(
  createRoutableExtension({
    name: 'PicpayPipelineRunPage',
    component: () =>
      import('./components/PipelineComponent').then(m => m.PipelineComponent),
    mountPoint: rootRouteRef,
  }),
);
