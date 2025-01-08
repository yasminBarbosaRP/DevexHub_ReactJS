import { renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { Info } from '.';

let rendered: any;

beforeEach(async () => {
  rendered = await renderInTestApp(<Info label="label" value="value" />);
});

describe('<Info />', () => {
  it('should to be defined', () => {
    expect(rendered.queryByText('label')).toBeInTheDocument();
    expect(rendered.queryByText('value')).toBeInTheDocument();
  });
});
