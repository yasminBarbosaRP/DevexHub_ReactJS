import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { ClusterPicker } from './ClusterPicker';

export const ClusterPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: ClusterPicker,
    name: 'ClusterPicker',
  }),
);
