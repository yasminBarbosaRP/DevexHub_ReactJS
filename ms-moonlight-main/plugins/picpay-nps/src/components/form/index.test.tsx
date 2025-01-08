import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { act, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { errorApiRef } from '@backstage/core-plugin-api';
import { NpsForm } from '.';

import { NpsApiClient, NpsApiRef } from '../../api';

let rendered: any;

interface Props {
  ratingList: number[];
  selectedRating: number;
  handleRating: Function;
  disabled: boolean;
}

const mockedProps = {
  handleClose: jest.fn(),
  handleForm: jest.fn(),
  survey: {
    id: '123',
    title: '',
    route: 'home',
    description: null,
    start_date: '',
    end_date: '',
  },
};

function MockedNpsStars(props: Props) {
  return (
    <>
      <h1>This is a mocked stars</h1>
      <button
        data-testid="mocked-nps-form-stars"
        disabled={props.disabled}
        onClick={() => {
          props.handleRating(props.ratingList[0]);
        }}
      >
        Star
      </button>
    </>
  );
}

jest.mock('../stars', () => ({ Stars: MockedNpsStars }));

const mockErrorApi: jest.Mocked<typeof errorApiRef.T> = {
  post: jest.fn(),
  error$: jest.fn(),
};

const mockApi: jest.Mocked<NpsApiClient> = {
  postSurveyAnswer: jest.fn().mockResolvedValue({
    id: '',
    survey_id: '',
    user: '',
    rating: 3,
    message: '',
    created_at: '',
    updated_at: '',
  }),
  postponeSurveyAnswer: jest.fn().mockResolvedValue({ survey: '' }),
} as any;

beforeEach(async () => {
  rendered = await renderInTestApp(
    <TestApiProvider
      apis={[
        [errorApiRef, mockErrorApi],
        [NpsApiRef, mockApi],
      ]}
    >
      <NpsForm {...mockedProps} />
    </TestApiProvider>,
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<NpsForm />', () => {
  it('should defined stars', () => {
    expect(rendered.getByTestId('mocked-nps-form-stars')).toBeInTheDocument();
  });
  it('should disabled send survey', () => {
    expect(rendered.getByTestId('form-send')).toBeDisabled();
  });
  it('should hidden comments', () => {
    expect(rendered.queryByText('Leave your comment')).toBeNull();
  });
  it('should show comments', async () => {
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-nps-form-stars'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.change(screen.getByPlaceholderText('Give us feedback'), {
          target: { value: 'message...' },
        });
      });
    });
    expect(rendered.queryByText('Leave your comment')).toBeInTheDocument();
  });
  it('should enable send survey', () => {
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-nps-form-stars'));
    });
    expect(rendered.getByTestId('form-send')).not.toBeDisabled();
  });
  it('should send survey', async () => {
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-nps-form-stars'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('form-send'));
      });
    });
    expect(rendered.getByTestId('success-message')).toBeInTheDocument();
  });
  it('should send survey error', async () => {
    const error = new Error('An unexpected error occurred.');
    mockApi.postSurveyAnswer.mockRejectedValueOnce(error);
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-nps-form-stars'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('form-send'));
      });
    });
    expect(rendered.queryByText('Try again')).toBeInTheDocument();
  });
  it('should send postpone', async () => {
    jest.spyOn(mockedProps, 'handleForm');
    jest.spyOn(mockedProps, 'handleClose');
    act(() => {
      fireEvent.click(rendered.getByTestId('mocked-nps-form-stars'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('form-postpone'));
      });
    });
    expect(mockedProps.handleForm).toHaveBeenCalled();
    expect(mockedProps.handleClose).toHaveBeenCalled();
  });
});
