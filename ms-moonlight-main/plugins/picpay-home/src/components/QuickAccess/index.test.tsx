import { QuickAccess } from './';
import React from 'react';
import { renderInTestApp } from '@backstage/test-utils';
import { fireEvent, screen } from '@testing-library/react';

let rendered: any;

beforeEach(async () => {
  rendered = await renderInTestApp(<QuickAccess />);
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('<QuickAccess />', () => {
  it('Validating if href link exists in Grafana Infra anchor', async () => {
    const grafanaInfra = rendered.getByText('Grafana Infra');
    expect(grafanaInfra).toBeInTheDocument();
    fireEvent.click(grafanaInfra);
    expect(screen.getByText('Grafana Infra').closest('a')).toHaveAttribute(
      'href',
      'https://grafana.observability.ppay.me/'
    );
  });
  it('Validating if href link exists in Sunlight Grafana Prod anchor', async () => {
    const grafanaProdSunlight = rendered.getByText('Sunlight Grafana Prod');
    expect(grafanaProdSunlight).toBeInTheDocument();
    fireEvent.click(grafanaProdSunlight);
    expect(
      screen.getByText('Sunlight Grafana Prod').closest('a')
    ).toHaveAttribute(
      'href',
      'https://grafana-prod-o11y.observability.ppay.me'
    );
  });
  it('Validating if href link exists in Sunlight Grafana QA anchor', async () => {
    const grafanaQASunlight = rendered.getByText('Sunlight Grafana QA');
    expect(grafanaQASunlight).toBeInTheDocument();
    fireEvent.click(grafanaQASunlight);
    expect(
      screen.getByText('Sunlight Grafana QA').closest('a')
    ).toHaveAttribute('href', 'https://grafana-qa-o11y.observability.ppay.me');
  });
  it('Validating if href link exists in Metabase Prod anchor', async () => {
    const metabaseProd = rendered.getByText('Metabase Prod');
    expect(metabaseProd).toBeInTheDocument();
    fireEvent.click(metabaseProd);
    expect(screen.getByText('Metabase Prod').closest('a')).toHaveAttribute(
      'href',
      'https://metabase.limbo.work/'
    );
  });
  it('Validating if href link exists in Metabase QA anchor', async () => {
    const metabaseQA = rendered.getByText('Metabase QA');
    expect(metabaseQA).toBeInTheDocument();
    fireEvent.click(metabaseQA);
    expect(screen.getByText('Metabase QA').closest('a')).toHaveAttribute(
      'href',
      'https://metabase.ms.qa.limbo.work/'
    );
  });
  it('Validating if href link exists in Sunlight Jaeger Prod of Moonlight anchor', async () => {
    const jaegerProdSunlight = rendered.getByText('Sunlight Jaeger Prod');
    expect(jaegerProdSunlight).toBeInTheDocument();
    fireEvent.click(jaegerProdSunlight);
    expect(
      screen.getByText('Sunlight Jaeger Prod').closest('a')
    ).toHaveAttribute('href', 'https://jaeger.observability.ppay.me/search');
  });
  it('Validating if href link exists in Sunlight Jaeger QA of Moonlight anchor', async () => {
    const jaegerQASunlight = rendered.getByText('Sunlight Jaeger QA');
    expect(jaegerQASunlight).toBeInTheDocument();
    fireEvent.click(jaegerQASunlight);
    expect(screen.getByText('Sunlight Jaeger QA').closest('a')).toHaveAttribute(
      'href',
      'https://jaeger-qa.observability.ppay.me/search'
    );
  });
  it('Validating if href link exists in Sunlight OpenSearch QA of Moonlight anchor', async () => {
    const openSearchQASunlight = rendered.getByText('Sunlight OpenSearch QA');
    expect(openSearchQASunlight).toBeInTheDocument();
    fireEvent.click(openSearchQASunlight);
    expect(
      screen.getByText('Sunlight OpenSearch QA').closest('a')
    ).toHaveAttribute(
      'href',
      'https://o11y-logs-qa.observability.ppay.me/_dashboards/app/home/'
    );
  });
});
