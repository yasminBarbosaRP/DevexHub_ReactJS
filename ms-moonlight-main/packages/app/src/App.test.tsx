import React from 'react';
import { render, waitFor } from '@testing-library/react';
import App from './App';

jest.mock('@internal/plugin-picpay-metrics', () => ({
  EntityType: { Component: 1 },
  Metrics: () => <></>,
  PicpayMetricsPage: () => <></>,
}));
jest.mock('@internal/plugin-picpay-houston', () => ({
  HoustonProvider: () => <></>,
}));
jest.mock('@backstage/app-defaults', () => ({
  createApp: () => ({
    createRoot: (element: JSX.Element) => () => <>{element}</>,
  }),
}));
jest.mock('@drodil/backstage-plugin-qeta', () => ({
  QetaPage: () => <></>,
}));


describe('App', () => {
  it('should render', async () => {
    process.env = {
      NODE_ENV: 'test',
      APP_CONFIG: [
        {
          data: {
            app: { title: 'Test' },
            backend: { baseUrl: 'http://localhost:7007' },
            techdocs: {
              storageUrl: 'http://localhost:7007/api/techdocs/static/docs',
            },
          },
          context: 'test',
        },
      ] as any,
    };

    const rendered = render(<App />);

    await waitFor(() => {
      expect(rendered.baseElement).toBeInTheDocument();
    });
  });
});