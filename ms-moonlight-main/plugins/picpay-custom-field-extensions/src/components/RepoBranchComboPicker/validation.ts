import type { FieldValidation } from '@rjsf/utils';
import { RepoBranchInfo } from './RepoBranchComboPicker';

export const repoBranchComboPickerValidation = (
  value: RepoBranchInfo,
  validation: FieldValidation,
) => {
  if (!value.branch) {
    validation.addError('branch is required');
  }
  if (!value.repository) {
    validation.addError('repository is required');
  }
};
