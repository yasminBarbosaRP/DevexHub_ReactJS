import { renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { Requester } from '.';
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
  ],
  updatedAt: '2022-06-01T00:00:00Z',
  createdAt: '2022-05-20T15:51:38.077Z',
};

describe('<Requester />', () => {
  it('should not be defined', async () => {
    rendered = await renderInTestApp(<Requester data={MOCK} />);
    expect(rendered.queryByText('Deletion:')).toBeNull();
  });

  it('should to be defined', async () => {
    rendered = await renderInTestApp(<Requester data={MOCK} />);
    expect(rendered.queryByText('alexandre.simoes')).toBeInTheDocument();
    expect(rendered.queryByText('20/05/2022')).toBeInTheDocument();
    expect(rendered.queryByText('01/06/2022')).toBeInTheDocument();
  });

  it('should to be defined when have deletion schedule', async () => {
    rendered = await renderInTestApp(
      <Requester
        data={{ ...MOCK, deletionSchedule: '2023-03-28T10:57:10.969Z' }}
      />,
    );
    expect(rendered.queryByText('alexandre.simoes')).toBeInTheDocument();
    expect(rendered.queryByText('20/05/2022')).toBeInTheDocument();
    expect(rendered.queryByText('01/06/2022')).toBeInTheDocument();
    expect(rendered.queryByText('Deletion:')).toBeInTheDocument();
    expect(rendered.queryByText('28/03/2023 10:57')).toBeInTheDocument();
  });
});
