import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { EntitiesPicker } from './EntitiesPicker';

export const EntitiesPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: EntitiesPicker,
    name: 'EntitiesPicker',
    schema: {
      returnValue: { type: 'array' },
    },
  }),
);
