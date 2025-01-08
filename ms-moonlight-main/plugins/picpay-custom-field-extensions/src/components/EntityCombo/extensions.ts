import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { EntityComboPicker } from './EntityComboPicker';
import { entityComboPickerValidation } from './validation';

export const EntityComboPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: EntityComboPicker,
    name: 'EntityComboPicker',
    validation: entityComboPickerValidation,
    schema: {
      returnValue: { type: 'object' },
    },
  }),
);
