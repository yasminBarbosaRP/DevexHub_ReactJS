import React from 'react';
import { render, screen } from '@testing-library/react';
import { HomePage } from './HomePage';
import { useHoustonContext } from '@internal/plugin-picpay-houston';

jest.mock('@internal/plugin-picpay-houston', () => ({
  useHoustonContext: jest.fn() as jest.Mock,
}));

jest.mock('../QuickAccess', () => ({
  QuickAccess: () => <div data-testid="quick-access">QuickAccess</div>,
}));

jest.mock('../WidgetTestCertified', () => ({
  ScoreTestCertified: () => <div data-testid="score-test-certified">ScoreTestCertified</div>,
}));

jest.mock('../Header', () => ({
  Header: () => <div data-testid="header-content">HeaderContent</div>,
}));

jest.mock('../Features', () => ({
  Features: () => <div data-testid="features">Features</div>,
}));

jest.mock('@internal/plugin-picpay-metrics', () => ({
  PicpayMetrics: () => <div data-testid="picpay-metrics">PicpayMetrics</div>,
}));

jest.mock('@backstage/core-components', () => ({
  Content: ({ children }: { children: React.ReactNode }) => <div data-testid="content">{children}</div>,
  Page: ({ children }: { children: React.ReactNode }) => <div data-testid="page">{children}</div>,
  Header: ({ title }: { title: string }) => <div data-testid="header">{title}</div>,
}));

jest.mock('@material-ui/core', () => ({
  Grid: ({ children }: { children: React.ReactNode }) => <div data-testid="grid">{children}</div>,
}));

describe('HomePage', () => {
  it('renders correctly when flags are enabled', () => {
    (useHoustonContext as jest.Mock).mockReturnValue({
      showNewHome: true,
      show_score_testcertified: true,
    });

    render(<HomePage />);

    expect(screen.getByTestId('page')).toBeInTheDocument();
    expect(screen.getByTestId('header')).toHaveTextContent('Home');
    expect(screen.getByTestId('content')).toBeInTheDocument();
    expect(screen.getByTestId('header-content')).toBeInTheDocument();
    expect(screen.getByTestId('quick-access')).toBeInTheDocument();
    expect(screen.getByTestId('features')).toBeInTheDocument();
    expect(screen.getByTestId('picpay-metrics')).toBeInTheDocument();
    expect(screen.getByTestId('score-test-certified')).toBeInTheDocument();
  });
});