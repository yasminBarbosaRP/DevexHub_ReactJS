import { errorApiRef } from '@backstage/core-plugin-api';
import { renderInTestApp, TestApiProvider } from '@backstage/test-utils';
import { act, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { FormDelete } from '.';
import { Sanctuary2ApiClient, Sanctuary2ApiRef } from '../../../..';

let rendered: any;

const mockedProps = {
  componentId: '32a1f0a2-e4f7-4ce0-a9dd-69fe0e93f2c7',
  appName: 'appName',
  componentKind: 'componentKind',
  handleCancel: jest.fn(),
  handleConfirm: jest.fn(),
};

const mockApi: jest.Mocked<Sanctuary2ApiClient> = {
  postDelete: jest.fn().mockResolvedValue({ error: false }),
} as any;

const mockErrorApi: jest.Mocked<typeof errorApiRef.T> = {
  post: jest.fn(),
  error$: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('<FormDelete />', () => {
  it('should to be defined', async () => {
    rendered = await renderInTestApp(
      <TestApiProvider apis={[[Sanctuary2ApiRef, mockApi]]}>
        <FormDelete {...mockedProps} />
      </TestApiProvider>,
    );
    expect(FormDelete).toBeDefined();
  });
  it('should cancel delete', async () => {
    rendered = await renderInTestApp(
      <TestApiProvider apis={[[Sanctuary2ApiRef, mockApi]]}>
        <FormDelete {...mockedProps} />
      </TestApiProvider>,
    );
    jest.spyOn(mockedProps, 'handleCancel');
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-cancel'));
      });
    });
    expect(mockedProps.handleCancel).toHaveBeenCalled();
  });
  it('should confirm delete', async () => {
    rendered = await renderInTestApp(
      <TestApiProvider apis={[[Sanctuary2ApiRef, mockApi]]}>
        <FormDelete {...mockedProps} />
      </TestApiProvider>,
    );
    jest.spyOn(mockedProps, 'handleConfirm');
    act(() => {
      fireEvent.click(rendered.getByTestId('radio-yes'));
    });
    act(() => {
      fireEvent.change(screen.getByPlaceholderText(''), {
        target: { value: 'message...' },
      });
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
    mockApi.postDelete.mockRejectedValueOnce(error);
    rendered = await renderInTestApp(
      <TestApiProvider
        apis={[
          [Sanctuary2ApiRef, mockApi],
          [errorApiRef, mockErrorApi],
        ]}
      >
        <FormDelete {...mockedProps} />
      </TestApiProvider>,
    );
    act(() => {
      fireEvent.click(rendered.getByTestId('radio-yes'));
    });
    act(() => {
      fireEvent.change(screen.getByPlaceholderText(''), {
        target: { value: 'message...' },
      });
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-confirm'));
      });
    });
    expect(rendered.getByTestId('alert-error')).toBeInTheDocument();
  });
});
