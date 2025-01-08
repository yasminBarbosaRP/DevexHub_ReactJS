import { scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { createScaffolderFieldExtension } from '@backstage/plugin-scaffolder-react';
import { StepInfo } from './StepInfo';

export const StepInfoFieldExtension = scaffolderPlugin.provide(
  createScaffolderFieldExtension({
    component: StepInfo,
    name: 'StepInfo',
  }),
);
