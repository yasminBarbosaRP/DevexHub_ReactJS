const INITIAL_STATE = {
  period: 'WEEK',
};

export default function ranking(state = INITIAL_STATE, action: any) {
  switch (action.type) {
    case '@ranking/update_period':
      return { ...state, period: action.period };
    default:
      return state;
  }
}
