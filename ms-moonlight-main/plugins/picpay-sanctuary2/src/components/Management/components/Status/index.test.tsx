import { renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { Status } from '.';
import { ProgressStatus } from '../../../../models';

let rendered: any;

describe('<Status />', () => {
  it('should to be rejected', async () => {
    rendered = await renderInTestApp(
      <Status
        postRetry={() => true}
        cancelDeletion={() => Promise.resolve()}
        data={ProgressStatus.REJECTED}
      />,
    );
    expect(rendered.queryByText('Rejected')).toBeInTheDocument();
  });
  it('should to be error', async () => {
    rendered = await renderInTestApp(
      <Status
        postRetry={() => true}
        cancelDeletion={() => Promise.resolve()}
        data={ProgressStatus.ERROR}
      />,
    );
    expect(rendered.queryByText('Error')).toBeInTheDocument();
  });
  it('should to be success', async () => {
    rendered = await renderInTestApp(
      <Status
        postRetry={() => true}
        cancelDeletion={() => Promise.resolve()}
        data={ProgressStatus.SUCCESS}
      />,
    );
    expect(rendered.queryByText('Finished')).toBeInTheDocument();
  });
  it('should to be schedule', async () => {
    rendered = await renderInTestApp(
      <Status
        postRetry={() => true}
        cancelDeletion={() => Promise.resolve()}
        data={ProgressStatus.APPROVED}
        deletionSchedule="2023-03-28T00:57:10.969Z"
      />,
    );
    expect(rendered.queryByText('Waiting for the date')).toBeInTheDocument();
  });
});
