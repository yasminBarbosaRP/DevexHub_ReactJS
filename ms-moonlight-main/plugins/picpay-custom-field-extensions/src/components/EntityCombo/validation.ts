import type { FieldValidation } from '@rjsf/utils';
import { Result } from './EntityComboPicker';

export const entityComboPickerValidation = (
  value: Result,
  validation: FieldValidation,
) => {
  for (const k of Object.keys(value)) {
    if (!value[k]) {
      validation.addError(`${k} is required`);
    }
  }
};
