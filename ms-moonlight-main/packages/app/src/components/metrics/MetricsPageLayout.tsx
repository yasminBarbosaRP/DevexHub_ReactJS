import { Header, Page, RoutedTabs } from '@backstage/core-components';
import {
  attachComponentData,
  useElementFilter,
} from '@backstage/core-plugin-api';
import { TabProps } from '@material-ui/core/Tab';
import { default as React } from 'react';

export type SubRoute = {
  path: string;
  title: string;
  children: JSX.Element;
  tabProps?: TabProps<React.ElementType, { component?: React.ElementType }>;
};

const dataKey = 'plugin.metricsPageLayoutRoute';

const Route: (props: SubRoute) => null = () => null;
attachComponentData(Route, dataKey, true);

attachComponentData(Route, 'core.gatherMountPoints', true);

export type MetricsPageLayoutProps = {
  title?: string;
  subtitle?: string;
  children?: React.ReactNode;
};

export const MetricsPageLayout = (props: MetricsPageLayoutProps) => {
  const { title, subtitle, children } = props;

  const routes = useElementFilter(children, elements =>
    elements
      .selectByComponentData({
        key: dataKey,
        withStrictError:
          'Child of MetricsPageLayout must be an MetricsPageLayout.Route',
      })
      .getElements<SubRoute>()
      .map(child => child.props),
  );

  return (
    <Page themeId="home">
      <Header
        title={title ?? 'Explore our ecosystem'}
        subtitle={subtitle ?? 'Discover solutions available in our ecosystem'}
      />
      <RoutedTabs routes={routes} />
    </Page>
  );
};

MetricsPageLayout.Route = Route;
