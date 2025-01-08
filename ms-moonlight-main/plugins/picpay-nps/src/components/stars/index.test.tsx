import { renderInTestApp } from '@backstage/test-utils';
import { act, fireEvent, screen } from '@testing-library/react';
import React from 'react';
import { Stars } from '.';

const mockedProps = {
  ratingList: [1, 2, 3, 4, 5],
  selectedRating: 0,
  handleRating: jest.fn(),
  disabled: false,
};

beforeEach(async () => {
  await renderInTestApp(<Stars {...mockedProps} />);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<Stars />', () => {
  it('should to be defined five stars', async () => {
    const stars = screen.getAllByRole('button');
    expect(stars.length).toEqual(5);
  });
  it('should handle click', async () => {
    jest.spyOn(mockedProps, 'handleRating');
    const star = screen.getAllByRole('button');
    act(() => {
      fireEvent.mouseOver(star[3]);
    });
    act(() => {
      fireEvent.mouseOut(star[3]);
    });
    act(() => {
      fireEvent.click(star[3]);
    });
    expect(mockedProps.handleRating).toHaveBeenCalled();
  });
});
