import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';

import { rootRouteRef } from './routes';

export const pluginGithubPlugin = createPlugin({
  id: 'picpay-github',
  routes: {
    root: rootRouteRef,
  },
});

export const PluginGithubPage = pluginGithubPlugin.provide(
  createRoutableExtension({
    name: 'PluginGithubPage',
    component: () =>
      import('./components/EntityIssues').then(m => m.EntityIssues),
    mountPoint: rootRouteRef,
  }),
);
