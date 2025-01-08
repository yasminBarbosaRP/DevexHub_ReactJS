import { renderInTestApp } from '@backstage/test-utils';
import { act, fireEvent } from '@testing-library/react';
import React from 'react';
import { Steps } from '.';
import { ProgressStatus, StatusResponse, StepStatus } from '../../../../models';

let rendered: any;

const MOCK: StatusResponse = {
  component: {
    id: '8ec93bb4-ccbe-408b-8dba-0095ffbac8b2',
    name: 'ms-moonlight-app',
  },
  requestedBy: 'alexandre.simoes',
  reviewers: [
    {
      githubProfile: 'Guest',
      email: 'ruan.nunes@picpay.com',
      status: 'APPROVED',
    },
  ],
  resion: 'teste via api moonlight',
  status: ProgressStatus.SUCCESS,
  steps: [
    {
      type: 'sonar',
      title: 'Deletion process of sonar',
      status: StepStatus.PENDING,
      events: [
        {
          type: 'info',
          message: 'sonarcloud project pending deletion',
          date: '2022-05-20T15:51:38.077Z',
        },
      ],
    },
    {
      type: 'kubernetes',
      title: 'Deletion process of kubernetes',
      status: StepStatus.PENDING,
      events: [],
    },
  ],
  updatedAt: '2022-06-01T00:00:00Z',
  createdAt: '2022-05-20T15:51:38.077Z',
};

const mockedProps = {
  refresh: jest.fn(),
};

describe('<Steps />', () => {
  it('should to be rendered', async () => {
    rendered = await renderInTestApp(
      <Steps data={MOCK} refresh={mockedProps.refresh} />,
    );
    expect(
      rendered.queryByText('Deletion process of sonar'),
    ).toBeInTheDocument();
  });
  it('should to be refresh', async () => {
    rendered = await renderInTestApp(
      <Steps data={MOCK} refresh={mockedProps.refresh} />,
    );
    jest.spyOn(mockedProps, 'refresh');
    act(() => {
      fireEvent.click(rendered.getByTestId('refresh'));
    });
    expect(mockedProps.refresh).toHaveBeenCalled();
  });
});
