import { renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { Reviewers } from '.';
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
      status: 'approved',
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

beforeEach(async () => {
  rendered = await renderInTestApp(<Reviewers reviewers={MOCK.reviewers} />);
});

describe('<Reviewers />', () => {
  it('should to be defined', () => {
    expect(rendered.queryByText('Guest')).toBeInTheDocument();
    expect(
      rendered.queryByText('● Minimum required for approval: 1'),
    ).toBeInTheDocument();
  });
});
