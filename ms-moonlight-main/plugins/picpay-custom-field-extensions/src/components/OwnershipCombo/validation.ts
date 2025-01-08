import type { FieldValidation } from '@rjsf/utils';
import { Result } from './OwnershipComboPicker';

export const ownershipComboPickerValidation = (
  value: Result,
  validation: FieldValidation,
) => {
  if (!value.bu) {
    validation.addError('BU is required');
  }
  if (!value.cluster || Object.keys(value.cluster).length === 0) {
    validation.addError('Cluster is required');
  }

  if (!value.affinity) {
    validation.addError('Node Affinity is required');
  }
};
