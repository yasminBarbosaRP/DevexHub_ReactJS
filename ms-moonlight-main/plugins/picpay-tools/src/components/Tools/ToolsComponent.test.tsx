import React from 'react';
import { ToolsComponent } from './ToolsComponent';
import { toolsApiRef } from '../../api';
import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';

const exploreApi: jest.Mocked<typeof toolsApiRef.T> = {
  getTools: jest.fn(),
};

const Wrapper = ({ children }: { children?: React.ReactNode }) => (
  <TestApiProvider apis={[[toolsApiRef, exploreApi]]}>
    {children}
  </TestApiProvider>
);

beforeEach(() => {
  jest.resetAllMocks();
});

describe('ToolsComponent', () => {
  it('renders the header with the correct title and subtitle', async () => {
    const { getByText } = await renderInTestApp(
      <Wrapper>
        <ToolsComponent />
      </Wrapper>,
    );

    expect(getByText('Explore the Moonlight Tools')).toBeInTheDocument();
    expect(getByText('Discover tools available at PicPay')).toBeInTheDocument();
  });
});
