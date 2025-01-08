import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { act, fireEvent } from '@testing-library/react';
import React from 'react';
import { NpsDialog } from '.';
import { NpsApiClient, NpsApiRef } from '../../api';
import { Props } from '../form/interfaces';

let rendered: any;

function MockedNpsForm(props: Props) {
  return (
    <>
      <h1>This is a mocked form</h1>
      <button
        data-testid="mocked-nps-form"
        onClick={() => {
          props.handleClose();
          props.handleForm({
            id: '',
            survey_id: props.survey.id,
            user: '',
            rating: '',
            message: '',
            created_at: '',
            updated_at: '',
          });
        }}
      >
        Mocked Form
      </button>
    </>
  );
}

jest.mock('../form', () => ({ NpsForm: MockedNpsForm }));

const mockApi: jest.Mocked<NpsApiClient> = {
  getSurveyList: jest.fn().mockResolvedValue({
    data: [
      {
        id: '123',
        title: '',
        route: 'home',
        description: '',
        start_date: '',
        end_date: '',
      },
    ],
  }),
} as any;

beforeEach(async () => {
  rendered = await renderInTestApp(
    <TestApiProvider apis={[[NpsApiRef, mockApi]]}>
      <NpsDialog />
    </TestApiProvider>,
  );
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<NpsDialog />', () => {
  it('should to be defined', () => {
    act(() => {
      history.pushState({ page_id: 0, user_id: 0 }, '', 'home');
    });
    expect(NpsDialog).toBeDefined();
    expect(rendered.queryByText('This is a mocked form')).toBeNull();
  });

  it('should render dialog and form in navigation', async () => {
    act(() => {
      history.pushState({ page_id: 0, user_id: 0 }, '', 'catalog');
    });

    const formEvents = rendered.getByTestId('mocked-nps-form');

    act(() => {
      fireEvent.click(formEvents);
    });
    expect(rendered.getByTestId('nps-dialog')).toBeInTheDocument();
    expect(formEvents).toBeInTheDocument();
  });
});
