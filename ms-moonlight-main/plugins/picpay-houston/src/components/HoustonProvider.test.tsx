import React from 'react';
import { HoustonProvider, useHoustonContext } from './HoustonProvider';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import { HoustonApiClient } from '../apis';
import { houstonApiRef } from '../apis';

const ComponentTest = () => {
  const flags = useHoustonContext() as any;
  return <div>{flags.flag}</div>;
};

const mockApi: jest.Mocked<HoustonApiClient> = {
  getFlags: jest.fn().mockResolvedValue({ flag: 'Flag value' }),
} as any;

describe('<HoustonProvider />', () => {
  it('should show flag value', async () => {
    const rendered = await renderInTestApp(
      <TestApiProvider apis={[[houstonApiRef, mockApi]]}>
        <HoustonProvider>
          <ComponentTest />
        </HoustonProvider>
      </TestApiProvider>,
    );

    expect(rendered.queryByText('Flag value')).toBeInTheDocument();
  });
});
