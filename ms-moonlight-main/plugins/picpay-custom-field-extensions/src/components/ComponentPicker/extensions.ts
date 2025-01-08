import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { ComponentPicker } from './ComponentPicker';

export const ComponentPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: ComponentPicker,
    name: 'ComponentPicker',
  }),
);
