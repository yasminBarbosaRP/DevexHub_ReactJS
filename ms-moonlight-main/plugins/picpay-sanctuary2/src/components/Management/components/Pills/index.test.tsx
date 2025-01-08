import { renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { Pills } from '.';
import { ReviewerStatus } from '../../../../models';

let rendered: any;

describe('<Pills />', () => {
  it('should to be pending', async () => {
    rendered = await renderInTestApp(
      <Pills type={ReviewerStatus.PENDING} value="value" />,
    );
    expect(rendered.getByTestId('pending')).toBeInTheDocument();
    expect(rendered.queryByText('value')).toBeInTheDocument();
  });
  it('should to be approved', async () => {
    rendered = await renderInTestApp(
      <Pills type={ReviewerStatus.APPROVED} value="value" />,
    );
    expect(rendered.getByTestId('approved')).toBeInTheDocument();
    expect(rendered.queryByText('value')).toBeInTheDocument();
  });
  it('should to be rejected', async () => {
    rendered = await renderInTestApp(
      <Pills type={ReviewerStatus.REJECTED} value="value" />,
    );
    expect(rendered.getByTestId('rejected')).toBeInTheDocument();
    expect(rendered.queryByText('value')).toBeInTheDocument();
  });
});
