import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { RepoBranchComboPicker } from './RepoBranchComboPicker';
import { repoBranchComboPickerValidation } from './validation';

export const RepoBranchFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: RepoBranchComboPicker,
    name: 'RepoBranchComboPicker',
    validation: repoBranchComboPickerValidation,
  }),
);
