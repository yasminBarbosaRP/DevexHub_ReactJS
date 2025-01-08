import React from 'react';
import { render, screen } from '@testing-library/react';
import { UserGroupsContext } from '@internal/plugin-picpay-commons';
import { ScoreTestCertified, getColor } from '../WidgetTestCertified/index';
import { CustomGaugeCard } from './CustomGaugeCard';

jest.mock('./CustomGaugeCard', () => ({
  CustomGaugeCard: jest.fn(() => <div data-testid="gauge-card" />),
}));

jest.mock('@backstage/core-plugin-api', () => ({
  ...jest.requireActual('@backstage/core-plugin-api'),
  createPlugin: jest.fn(() => ({
    getApi: jest.fn(),
    provide: jest.fn(),
  })),
  useApi: jest.fn(() => ({
    getGroupsScore: jest.fn().mockResolvedValue({ score: 50 }),
  })),
}));

const mockContextValue = {
  userGroups: null,
  userInfo: null,
  setUserGroups: jest.fn(),
  setUserInfo: jest.fn(),
};

describe('ScoreTestCertified', () => {
  const renderWithContext = (userGroups: { label: string; ref: string; type: string; children: string[]; isOwnerOfEntities: boolean }[] | null) => {
    render(
      <UserGroupsContext.Provider value={{ ...mockContextValue, userGroups }}>
        <ScoreTestCertified />
      </UserGroupsContext.Provider>
    );
  };

  it('renders the CustomGaugeCard with the correct props', async () => {
    const mockGroups = [{ label: 'Grupo C', ref: 'ref-3', type: 'group', children: ['ref-4'], isOwnerOfEntities: false }];
    renderWithContext(mockGroups);

    const gaugeCard = await screen.findByTestId('gauge-card');
    expect(gaugeCard).toBeInTheDocument();

    // Mock do CustomGaugeCard
    const mockCustomGaugeCard = CustomGaugeCard as jest.Mock;
    expect(mockCustomGaugeCard).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Certified',
        subheader: 'Quality metrics overview',
        deepLink: { title: 'View details', link: '/tech-metrics/test-certified' },
        progress: 0.5,
        getColor: expect.any(Function),
      }),
      {},
    );
  });

  it('renders correctly when there are no groups', () => {
    renderWithContext(null);
    expect(screen.getByTestId('gauge-card')).toBeInTheDocument();
  });

  it('renders correctly when there are groups', () => {
    const mockGroups = [{ label: 'Grupo A', ref: 'ref-1', type: 'group', children: ['ref-4'], isOwnerOfEntities: false }];
    renderWithContext(mockGroups);

    expect(screen.getByTestId('gauge-card')).toBeInTheDocument();
  });

  describe('getColor function', () => {
    it('returns green for values > 0.5', () => {
      expect(getColor(0.6)).toBe('green');
    });

    it('returns red for values <= 0.5', () => {
      expect(getColor(0.5)).toBe('red');
      expect(getColor(0.4)).toBe('red');
    });
  });
});
