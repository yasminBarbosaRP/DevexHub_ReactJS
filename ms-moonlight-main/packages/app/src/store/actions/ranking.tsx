export const actions = {
  updatePeriod: '@ranking/update_period',
};

export default function rankingPeriodUpdateAction(period: string) {
  return {
    type: actions.updatePeriod,
    period,
  };
}
