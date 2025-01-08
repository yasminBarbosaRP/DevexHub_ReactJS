import { render, act, fireEvent } from '@testing-library/react';
import { TutorialModal } from './TutorialModal';
import React from 'react';

let rendered: any;

beforeEach(async () => {
  rendered = render(<TutorialModal open toggle={() => {}} />);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('TutorialModal', () => {
  it('should render', () => {
    expect(TutorialModal).toBeDefined();
  });
});

describe('Steps', () => {
  it('should render step correctly', () => {
    const { getByText } = rendered;

    expect(getByText('1 of 6')).toBeInTheDocument();
    expect(getByText('Centralized CI/CD process')).toBeInTheDocument();

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByText('2 of 6')).toBeInTheDocument();
    expect(getByText('Status of each pipeline')).toBeInTheDocument();

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByText('3 of 6')).toBeInTheDocument();
    expect(getByText('Pull Request')).toBeInTheDocument();

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByText('4 of 6')).toBeInTheDocument();
    expect(getByText('Deploy QA')).toBeInTheDocument();

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByText('5 of 6')).toBeInTheDocument();
    expect(getByText('Push main')).toBeInTheDocument();

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByText('6 of 6')).toBeInTheDocument();
    expect(getByText('Deploy Prod')).toBeInTheDocument();
  });

  it('validate src on img', () => {
    const { getByAltText } = rendered;
    expect(getByAltText('tutorial')).toHaveAttribute('src', '1.svg');

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByAltText('tutorial')).toHaveAttribute('src', '2.svg');

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByAltText('tutorial')).toHaveAttribute('src', '3.svg');

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByAltText('tutorial')).toHaveAttribute('src', '4.svg');

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByAltText('tutorial')).toHaveAttribute('src', '5.svg');

    act(() => {
      fireEvent.click(rendered.queryByText('Next'));
    });
    expect(getByAltText('tutorial')).toHaveAttribute('src', '6.svg');
  });
});

describe('Buttons', () => {
  it('should render next button', () => {
    expect(rendered.queryByText('Next')).toBeInTheDocument();
  });

  it('should render previous button', () => {
    expect(rendered.queryByText('Previous')).toBeInTheDocument();
  });

  it('should render skip button', () => {
    expect(rendered.queryByText('Skip Tutorial')).toBeInTheDocument();
  });
});
