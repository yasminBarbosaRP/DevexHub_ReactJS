export interface Props {
  status: Status;
  callback: Function;
  minDate?: String;
  maxDate?: String;
}

export enum Status {
  Success = 1,
  Pending,
  Error,
}

export enum RangeTypeItem {
  minutes = 1,
  days,
  month,
  custom,
}
export interface RangeItem {
  label: string;
  value: number;
  type: RangeTypeItem;
}

export interface RangeGroup extends Array<RangeItem> {}

export interface SelectedPeriod {
  group: number;
  index: number;
  value: RangeItem;
}
