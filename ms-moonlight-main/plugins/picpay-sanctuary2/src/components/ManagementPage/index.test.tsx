import { TestApiProvider, renderInTestApp } from '@backstage/test-utils';
import React from 'react';
import { ManagementPage } from '.';
import { catalogApiRef, CatalogApi } from '@backstage/plugin-catalog-react';
import { Sanctuary2ApiRef, Sanctuary2ApiClient } from '../../api';

let rendered: any;

jest.mock('../Management', () => ({
  Management: () => <h1>Management OK</h1>,
}));

jest.mock('react-router', () => ({
  ...jest.requireActual('react-router'),
  useParams: () => ({ id: '62f2d3d39819cfcb0d173611' }),
}));

const sanctuary2Api: jest.Mocked<Sanctuary2ApiClient> = {
  getStatusByID: jest.fn().mockResolvedValue({
    data: {
      id: '62f2d3d39819cfcb0d173611',
      name: 'ms-test',
    },
  }),
  getStatus: jest.fn().mockResolvedValue({
    id: '62f2d3d39819cfcb0d173611',
    name: 'ms-test',
  }),
} as any;

const catalogApi: jest.Mocked<CatalogApi> = {
  getEntities: jest.fn().mockResolvedValue({
    data: [{ metadata: { uid: '7eb35d3a-de26-43d2-9fde-294e3152ec2a' } }],
  }),
} as any;

beforeEach(async () => {
  rendered = await renderInTestApp(
    <TestApiProvider
      apis={[
        [Sanctuary2ApiRef, sanctuary2Api],
        [catalogApiRef, catalogApi],
      ]}
    >
      <ManagementPage />
    </TestApiProvider>,
  );
});

describe('<ManagementPage />', () => {
  it('should to be defined', () => {
    expect(rendered.queryByText('Management OK')).toBeInTheDocument();
    expect(ManagementPage).toBeDefined();
  });
});
