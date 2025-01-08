import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { OwnershipComboPicker } from './OwnershipComboPicker';
import { ownershipComboPickerValidation } from './validation';

export const OwnershipComboPickerFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: OwnershipComboPicker,
    name: 'OwnershipComboPicker',
    validation: ownershipComboPickerValidation,
  }),
);
