import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { GuardRailTable } from './GuardRail';

type MetricsData = {
  squad: string;
  service: string;
  sonar: boolean;
  canary: boolean;
  mutation: boolean;
  endToEnd: boolean;
};

jest.mock('@backstage/core-components', () => ({
  Table: jest.fn(({ data, title, onPageChange }) => (
    <div data-testid="mock-table">
      <h1>{title}</h1>
      {data.map((row: MetricsData, index: number) => (
        <div key={index} data-testid="table-row">
          <span>{row.squad}</span>
          <span>{row.service}</span>
          <span>{row.sonar ? '✓' : '✗'}</span>
          <span>{row.canary ? '✓' : '✗'}</span>
          <span>{row.mutation ? '✓' : '✗'}</span>
          <span>{row.endToEnd ? '✓' : '✗'}</span>
        </div>
      ))}
      <button onClick={() => onPageChange(1)}>Next Page</button>
    </div>
  )),
}));

describe('GuardRailTable', () => {
  const mockData: MetricsData[] = [
    {
      squad: 'Projeto A',
      service: 'Service A',
      sonar: true,
      canary: false,
      mutation: true,
      endToEnd: false,
    },
    {
      squad: 'Projeto B',
      service: 'Service B',
      sonar: false,
      canary: true,
      mutation: false,
      endToEnd: true,
    },
  ];

  const mockOnPageChange = jest.fn();

  it('renders table with provided data and correct columns', () => {
    render(<GuardRailTable data={mockData} page={0} onPageChange={mockOnPageChange} />);

    mockData.forEach((row) => {
      expect(screen.getByText(row.squad)).toBeInTheDocument();
      expect(screen.getByText(row.service)).toBeInTheDocument();
      expect(screen.getAllByText(row.sonar ? '✓' : '✗').length).toBeGreaterThan(0);
      expect(screen.getAllByText(row.mutation ? '✓' : '✗').length).toBeGreaterThan(0);
      expect(screen.getAllByText(row.endToEnd ? '✓' : '✗').length).toBeGreaterThan(0);
    });
  });

  it('calls onPageChange when page changes', () => {
    render(
      <GuardRailTable page={0} onPageChange={mockOnPageChange} data={mockData} />
    );

    const nextPageButton = screen.getByText('Next Page');
    fireEvent.click(nextPageButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(1);
  });

  it('renders empty state correctly when no data is provided', () => {
    render(<GuardRailTable data={[]} page={0} onPageChange={mockOnPageChange} />);

    const emptyStateText = screen.getByText('No data available');

    expect(emptyStateText).toBeInTheDocument();
  });
});