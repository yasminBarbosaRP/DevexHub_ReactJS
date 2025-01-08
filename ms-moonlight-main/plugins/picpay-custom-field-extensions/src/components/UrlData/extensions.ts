import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { UrlDataPicker } from './UrlData';

export const UrlDataFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: UrlDataPicker,
    name: 'UrlDataPicker',
  }),
);
