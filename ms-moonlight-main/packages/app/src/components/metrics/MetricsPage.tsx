import React from 'react';
import { MetricsPageLayout } from './MetricsPageLayout';
import { PullRequests, ScorePage } from '@internal/plugin-picpay-metrics';
import { useHoustonContext } from '@internal/plugin-picpay-houston';


export const MetricsPage = () => {
  const flags = useHoustonContext();

  return (
    <MetricsPageLayout
      title="Metrics"
      subtitle="This view provides application health information to teams and leaders"
    >
      <MetricsPageLayout.Route path="pull-requests" title="Pull Requests">
        <PullRequests />
      </MetricsPageLayout.Route>
      {flags?.show_score_tab &&
        <MetricsPageLayout.Route path="test-certified" title="Test Certified">
          <ScorePage />
        </MetricsPageLayout.Route>
      }

    </MetricsPageLayout>
  );
};

export const metricsPage = <MetricsPage />;
