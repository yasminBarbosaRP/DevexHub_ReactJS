import { wrapInTestApp } from '@backstage/test-utils';
import { act, render, RenderResult, waitFor } from '@testing-library/react';
import { oldLogsButton } from './shared';

const OLD_LOGS_BUTTON_ID = 'old-logs-button';

describe('<OldLogs />', () => {
  it('renders without exploding', async () => {
    let renderResult: RenderResult;

    await act(async () => {
      renderResult = render(wrapInTestApp(oldLogsButton()));
    });

    await waitFor(() =>
      expect(renderResult.getByTestId(OLD_LOGS_BUTTON_ID)).toBeInTheDocument(),
    );
  });
});
