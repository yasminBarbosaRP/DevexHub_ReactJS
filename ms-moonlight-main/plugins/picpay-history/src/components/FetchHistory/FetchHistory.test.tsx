import { renderInTestApp } from '@backstage/test-utils';
import { fireEvent, act, screen } from '@testing-library/react';
import React from 'react';
import { FetchHistory } from '../FetchHistory';
import { Status, Request } from './interfaces';

let rendered: any;

const mockProps = {
  data: [
    {
      id: '647debaaa70c653ca387788d',
      component: { name: 'ms-moonlight' },
      type: Request.Delete,
      status: Status.WaitingApproval,
      owner: 'atlantis',
      user: 'francisco.junior',
      subvalue: 'service',
    },
  ],
};

beforeEach(async () => {
  rendered = await renderInTestApp(<FetchHistory {...mockProps} />);
});

afterEach(() => {
  jest.clearAllMocks();
});

describe('<FetchHistory />', () => {
  it('should if rendered text Actions History', () => {
    const actionHistory = rendered.getAllByText('Actions History');
    expect(actionHistory.length).toEqual(1);
  });

  it('should if all columns are being rendered', () => {
    const component = rendered.getAllByText('Component Name');
    expect(component.length).toEqual(1);

    const request = rendered.getAllByText('Request');
    expect(request.length).toEqual(1);

    const status = rendered.getAllByText('Status');
    expect(status.length).toEqual(1);

    const owner = rendered.getAllByText('Owner');
    expect(owner.length).toEqual(1);

    const user = rendered.getAllByText('User');
    expect(user.length).toEqual(1);
  });

  it('mocked component', () => {
    const owner = rendered.getAllByText('atlantis');
    expect(owner.length).toEqual(1);

    const subvalue = rendered.getAllByText('service');
    expect(subvalue.length).toEqual(1);

    const requestType = rendered.getAllByText('Delete');
    expect(requestType.length).toEqual(1);

    const status = rendered.getAllByText('Waiting Approval');
    expect(status.length).toEqual(1);
  });

  it('should if the filter is searching correctly', () => {
    const search = rendered.getByPlaceholderText('Filter');
    fireEvent.change(search, { target: { value: 'ms-moonlight' } });
    expect(search.value).toEqual('ms-moonlight');
  });

  it('should if there is a redirect to the component management page', () => {
    const url = screen.getAllByRole('link');
    act(() => {
      fireEvent.click(url[0]);
    });

    expect(url.length).toEqual(1);
  });
});
