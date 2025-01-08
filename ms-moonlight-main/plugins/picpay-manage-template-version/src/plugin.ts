import { createPlugin, createRoutableExtension } from '@backstage/core-plugin-api';
import { rootRouteRef } from './routes';

export const manageTemplateVersionPlugin = createPlugin({
  id: 'picpay-manage-template-version',
  routes: {
    root: rootRouteRef,
  },
});

export const ManageTemplateVersionPage = manageTemplateVersionPlugin.provide(
  createRoutableExtension({
    name: 'PicpayManageTemplateVersionPage',
    component: () =>
      import('./components/ManagerTemplateVersion').then(m => m.ManagerTemplateVersion),
    mountPoint: rootRouteRef,
  }),
);