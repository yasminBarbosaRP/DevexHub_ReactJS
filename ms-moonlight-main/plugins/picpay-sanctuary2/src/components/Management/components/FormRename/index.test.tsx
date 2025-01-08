import { renderInTestApp } from '@backstage/test-utils';
import { act, fireEvent, waitFor, screen } from '@testing-library/react';
import React from 'react';
import { FormRename } from '.';

let rendered: any;

const mockedProps = {
  componentId: '8ec93bb4-ccbe-408b-8dba-0095ffbac8b2',
  appName: 'appName',
  handleCancel: jest.fn(),
  handleConfirm: jest.fn(),
};

afterEach(() => {
  jest.clearAllMocks();
});

describe('<FormRename />', () => {
  it('should to be defined', async () => {
    rendered = await renderInTestApp(<FormRename {...mockedProps} />);
    expect(FormRename).toBeDefined();
  });
  it('should cancel rename', async () => {
    rendered = await renderInTestApp(<FormRename {...mockedProps} />);
    jest.spyOn(mockedProps, 'handleCancel');
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-cancel'));
      });
    });
    expect(mockedProps.handleCancel).toHaveBeenCalled();
  });
  it('should confirm rename', async () => {
    rendered = await renderInTestApp(<FormRename {...mockedProps} />);
    jest.spyOn(mockedProps, 'handleConfirm');
    act(() => {
      fireEvent.change(
        screen.getByPlaceholderText('ex: ms-new-name-component'),
        { target: { value: 'app-name' } },
      );
    });
    await waitFor(() => {
      act(() => {
        fireEvent.click(rendered.getByTestId('btn-confirm'));
      });
    });
    expect(mockedProps.handleConfirm).toHaveBeenCalled();
  });
});
