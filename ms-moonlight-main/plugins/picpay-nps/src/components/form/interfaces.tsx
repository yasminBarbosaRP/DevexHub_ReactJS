import { NpsSurvey } from '../../api';

export interface Props {
  handleClose: Function;
  survey: NpsSurvey;
  handleForm: Function;
}

export enum Status {
  pending = 1,
  loading,
  success,
  error,
}
