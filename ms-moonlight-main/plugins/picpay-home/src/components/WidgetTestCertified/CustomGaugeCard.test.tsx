import React from 'react';
import { render } from '@testing-library/react';
import { CustomGaugeCard } from './CustomGaugeCard';
import '@testing-library/jest-dom';


jest.mock('@backstage/core-components', () => ({
  ...jest.requireActual('@backstage/core-components'),
  Gauge: () => <div data-testid="gauge">Gauge Component</div>,
}));

describe('CustomGaugeCard', () => {
  it('should render correctly with the passed properties', () => {
    const props = {
      title: 'Test Title',
      progress: 0.5,
      size: 'normal' as 'normal' | 'small',
    };

   
    const { getByText, getByTestId } = render(<CustomGaugeCard {...props} />);

   
    expect(getByText('Test Title')).toBeInTheDocument();

    expect(getByTestId('gauge')).toBeInTheDocument();
  });

  it('must apply the correct style to the "small" size"', () => {
    const props = {
      title: 'Test Title',
      progress: 0.5,
      size: 'small' as 'normal' | 'small',
    };

    const { getByText } = render(<CustomGaugeCard {...props} />);

    expect(getByText('Test Title')).toBeInTheDocument();
  });

  it('should not display the subtitle when it is not passed', () => {
    const props = {
      title: 'Test Title',
      progress: 0.5,
    };

    const { queryByText } = render(<CustomGaugeCard {...props} />);

    expect(queryByText('Test Subheader')).not.toBeInTheDocument();
  });
});