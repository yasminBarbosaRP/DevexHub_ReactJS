import { RangeTypeItem, RangeGroup } from './types';

export const rangeList: Array<RangeGroup> = [
  [
    { label: '30 minutes', value: 30, type: RangeTypeItem.minutes },
    { label: '60 minutes', value: 60, type: RangeTypeItem.minutes },
  ],
  [
    { label: '3 days', value: 3, type: RangeTypeItem.days },
    { label: '7 days', value: 7, type: RangeTypeItem.days },
  ],
  [{ label: '1 month', value: 1, type: RangeTypeItem.month }],
  [{ label: 'Set custom...', value: 0, type: RangeTypeItem.custom }],
];

export const initialPeriod = {
  group: 0,
  index: 0,
  value: rangeList[0][0],
};
