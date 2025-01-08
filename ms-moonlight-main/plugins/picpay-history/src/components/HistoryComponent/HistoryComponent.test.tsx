// @ts-nocheck

import {
  render,
  within,
  act,
  RenderResult,
  waitFor,
  queryAllByTestId,
} from '@testing-library/react';
import React from 'react';
import { Select, SupportButton } from '@backstage/core-components';
import {
  renderInTestApp,
  TestApiProvider,
  wrapInTestApp,
} from '@backstage/test-utils';
import { HistoryApi, HistoryApiRef } from '../../api';
import { HistoryComponent } from '../HistoryComponent';
import userEvent from '@testing-library/user-event';
import { fireEvent, screen } from '@testing-library/react';

let rendered: RenderResult;

const SUPPORT_BUTTON_ID = 'support-button';
const requestItems = [
  {
    label: 'Delete',
    value: 'delete',
  },
  {
    label: 'Recovery',
    value: 'Recovery',
  },
];

const requestProps = {
  onChange: jest.fn(),
  label: 'Request',
  placeholder: 'All results',
  items: requestItems,
};

const mockApi: jest.Mocked<HistoryApi> = {
  getHistoryComponent: jest.fn().mockResolvedValue({
    data: [
      {
        type: 'delete',
        component: { name: 'ms-moonlight' },
        requestedBy: 'bruno.rodrigues',
        status: 'pending',
        owner: 'squad-atlantis',
      },
    ],
  }),
};

const mockHistoryComponent = jest.fn(() => {
  return <HistoryComponent />;
});

let renderWrapper: any;

afterEach(() => {
  jest.clearAllMocks();
});

describe('<HistoryComponent/>', () => {

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <TestApiProvider apis={[[HistoryApiRef, mockApi]]}>
      <HistoryComponent />
    </TestApiProvider>
  );

  it('should display current value', async () => {

    renderWrapper = await renderInTestApp(
      <Wrapper>
        <HistoryComponent />
      </Wrapper>
    )

    const { getAllByText } = renderWrapper;

    const result = getAllByText('All results');
    expect(result.length).toBeGreaterThan(0);
  });

  it('should other Delete seleted', async () => {

    renderWrapper = await renderInTestApp(
      <Wrapper>
        <HistoryComponent />
      </Wrapper>
    )

    const { getByText, getAllByText, queryByTestId } = renderWrapper;

    expect(getAllByText('Request').length).toBeGreaterThan(0);

    const selectBtn = queryByTestId('select-operation');

    act(() => {
      fireEvent.click(getByText('Delete'));
    })

    expect(getAllByText('Delete').length).toBeGreaterThan(0);
  });
});
