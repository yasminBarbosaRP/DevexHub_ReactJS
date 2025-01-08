import React from 'react';
import { errorApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { act, fireEvent, waitFor } from '@testing-library/react';
import { Approver } from '.';
import { Sanctuary2ApiClient, Sanctuary2ApiRef } from '../../../..';

let rendered: any;

const mockedProps = {
  actionId: '53189ef2-de7d-41db-8893-c324b92c59a9',
  email: 'email@test.com',
  handleConfirm: jest.fn(),
};

const mockApi: jest.Mocked<Sanctuary2ApiClient> = {
  postApprover: jest.fn().mockResolvedValue({ error: false }),
} as any;

const mockErrorApi: jest.Mocked<typeof errorApiRef.T> = {
  post: jest.fn(),
  error$: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('<Approver />', () => {
  it('should to be defined', async () => {
    rendered = await renderInTestApp(
      <TestApiProvider apis={[[Sanctuary2ApiRef, mockApi]]}>
        <Approver {...mockedProps} />
      </TestApiProvider>,
    );
    expect(Approver).toBeDefined();
  });
  it('should confirm delete and callback', async () => {
    rendered = await renderInTestApp(
      <TestApiProvider apis={[[Sanctuary2ApiRef, mockApi]]}>
        <Approver {...mockedProps} />
      </TestApiProvider>,
    );
    jest.spyOn(mockedProps, 'handleConfirm');
    act(() => {
      fireEvent.click(rendered.getByTestId('radio-yes'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-confirm'));
      });
    });
    expect(mockedProps.handleConfirm).toHaveBeenCalled();
  });
  it('should confirm delete failed', async () => {
    const error = new Error('An unexpected error occurred.');
    mockApi.postApprover.mockRejectedValueOnce(error);
    rendered = await renderInTestApp(
      <TestApiProvider
        apis={[
          [Sanctuary2ApiRef, mockApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <Approver {...mockedProps} />
      </TestApiProvider>,
    );
    act(() => {
      fireEvent.click(rendered.getByTestId('radio-no'));
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-confirm'));
      });
    });
    expect(rendered.getByTestId('alert-error')).toBeInTheDocument();
  });
});
