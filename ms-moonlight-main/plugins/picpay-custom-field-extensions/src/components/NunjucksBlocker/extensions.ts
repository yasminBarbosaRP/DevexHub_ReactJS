import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { NunjucksBlocker } from './NunjucksBlocker';

export const NunjucksBlockerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: NunjucksBlocker,
    name: 'NunjucksBlocker',
  }),
);
