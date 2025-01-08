// @ts-nocheck
import React from 'react';
import { render, screen } from '@testing-library/react';
import { CreatedAtColumn } from './CreatedAtColumn';
import { DateTime } from 'luxon';
import humanizeDuration from 'humanize-duration';

jest.mock('humanize-duration');

describe('CreatedAtColumn', () => {
  beforeAll(() => {
    // Mock the current date to January 2, 2023
    jest.useFakeTimers().setSystemTime(new Date('2023-01-02T12:00:00Z').getTime());
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('displays "1 day ago" when createdAt is one day ago', () => {
    // Mock humanizeDuration to return "1 day"
    (humanizeDuration as jest.Mock).mockReturnValue('1 day');

    const oneDayAgo = DateTime.local().minus({ days: 1 }).toISO();

    render(<CreatedAtColumn createdAt={oneDayAgo} />);

    expect(screen.getByText('1 day ago')).toBeInTheDocument();
  });
});