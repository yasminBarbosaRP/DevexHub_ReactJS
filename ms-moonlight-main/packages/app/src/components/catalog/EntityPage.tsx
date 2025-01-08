// @ts-nocheck

import React, { ReactNode } from 'react';
import { Grid } from '@material-ui/core';
import {
  EntityApiDefinitionCard,
  EntityConsumedApisCard,
  EntityConsumingComponentsCard,
  EntityHasApisCard,
  EntityProvidedApisCard,
  EntityProvidingComponentsCard,
} from '@backstage/plugin-api-docs';
import {
  EntityAboutCard,
  EntityDependsOnComponentsCard,
  EntityDependsOnResourcesCard,
  EntityHasResourcesCard,
  EntityHasSystemsCard,
  EntityLayout,
  EntityLinksCard,
  EntitySwitch,
  EntityLabelsCard,
  EntityOrphanWarning,
  EntityProcessingErrorsPanel,
  isComponentType,
  isKind,
  hasCatalogProcessingErrors,
  isOrphan,
} from '@backstage/plugin-catalog';
import {
  Direction,
  EntityCatalogGraphCard,
} from '@backstage/plugin-catalog-graph';
import {
  Entity,
  RELATION_API_CONSUMED_BY,
  RELATION_API_PROVIDED_BY,
  RELATION_CONSUMES_API,
  RELATION_DEPENDENCY_OF,
  RELATION_DEPENDS_ON,
  RELATION_HAS_PART,
  RELATION_PART_OF,
  RELATION_PROVIDES_API,
} from '@backstage/catalog-model';

import {
  EntityUserProfileCard,
  EntityMembersListCard,
  EntityOwnershipCard,
} from '@backstage/plugin-org';
import { EntityTechdocsContent } from '@backstage/plugin-techdocs';
import { EntitySonarQubeCard } from '@backstage-community/plugin-sonarqube';
import { PicpayMetrics } from '@internal/plugin-picpay-metrics';
import { Management } from '@internal/plugin-picpay-sanctuary2/';
import { EntityTasks } from '@internal/plugin-picpay-tasks/';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { PicpayEntityCardsPage as EntityEnvironment } from '@internal/plugin-picpay-entity-cards';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import {
  catalogApiRef,
  useAsyncEntity,
  useEntity,
} from '@backstage/plugin-catalog-react';
import { ProdEnvironmentWarning, showEnvironmentError } from './Environments';
import { useApi, alertApiRef, errorApiRef } from '@backstage/core-plugin-api';
import { VisionCatalogContent } from '@internal/plugin-picpay-vision';
import { Cicd } from './Cicd';
import CachedIcon from '@material-ui/icons/Cached';
import { QetaContent } from './QetaContent';
import { refreshStateApiRef } from '@internal/plugin-picpay-entity-refresh-status';
import { GroupProfileCardWithLead } from './GroupProfileCardWithLead';
import { EntityIssues } from '@internal/plugin-picpay-github';
import { EntityLinksCard as CustomEntityLinksCard } from './CustomEntityLinksCard';
import { ManagerTemplateVersion } from '@internal/plugin-picpay-manage-template-version';

const customEntityFilterKind = ['Component', 'API', 'System'];
const isNotServiceType: bool = (entity: Entity) =>
  entity.spec?.type !== 'service';
const isGithubSourceLocation: bool = (entity: Entity) =>
  entity.metadata.annotations?.['backstage.io/source-location']?.includes('github.com');
const isNotComponent: bool = (entity: Entity) => entity.kind !== 'Component';

export const EntityLayoutWrapper = (props: { children?: ReactNode }) => {
  const { entity } = useAsyncEntity();

  const refreshState = useApi(refreshStateApiRef);
  const alertApi = useApi(alertApiRef);
  const errorApi = useApi(errorApiRef);

  const disableUnregisterEntity = {
    disableUnregister: true,
  };

  return (
    <EntityLayout
      UNSTABLE_extraContextMenuItems={[
        {
          title: 'Force refresh',
          Icon: CachedIcon,
          onClick: () => {
            refreshState
              .forceRefresh(
                entity.metadata.name,
                entity.kind.toLowerCase(),
                entity.metadata.namespace ?? 'default',
                -432_000
              )
              .then(res => {
                alertApi.post({
                  message: 'Force Refresh scheduled',
                  severity: 'info',
                  display: 'transient',
                });
              })
              .catch(e => {
                errorApi.post(e);
              });
          },
        },
      ]}
      UNSTABLE_contextMenuOptions={disableUnregisterEntity}
    >
      {props.children}
      {entity &&
        ['Resource', 'Component', 'API', 'Template'].includes(entity.kind) &&
        isGithubSourceLocation(entity) ?
        (
          <EntityLayout.Route path="/management" title="Management">
            <Management />
          </EntityLayout.Route>
        )
        : null}

    </EntityLayout>
  );
};

const MetricsPage = ({ source }: { source: 'SERVICE' | 'GROUP' }) => {
  const { entity } = useEntity();

  return <PicpayMetrics source={source} entity={entity} />;
};

const techdocsContent = (
  <EntityTechdocsContent>
    <TechDocsAddons>
      <ReportIssue />
    </TechDocsAddons>
  </EntityTechdocsContent>
);

const EntityWarningContent = () => {
  const { entity } = useEntity();
  const catalogApi = useApi(catalogApiRef);

  return (
    <>
      <EntitySwitch>
        <EntitySwitch.Case if={() => showEnvironmentError(entity, catalogApi)}>
          <Grid item xs={12}>
            <ProdEnvironmentWarning />
          </Grid>
        </EntitySwitch.Case>
      </EntitySwitch>

      <EntitySwitch>
        <EntitySwitch.Case if={isOrphan}>
          <Grid item xs={12}>
            <EntityOrphanWarning />
          </Grid>
        </EntitySwitch.Case>
      </EntitySwitch>

      <EntitySwitch>
        <EntitySwitch.Case if={hasCatalogProcessingErrors}>
          <Grid item xs={12}>
            <EntityProcessingErrorsPanel />
          </Grid>
        </EntitySwitch.Case>
      </EntitySwitch>
    </>
  );
};

const overviewContent = (
  <Grid container spacing={3} alignItems="stretch">
    <EntityWarningContent />
    <EntitySwitch>
      <EntitySwitch.Case if={isKind('component')}>
        <Grid item md={6} xs={12}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntitySonarQubeCard variant="gridItem" />
        </Grid>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isNotComponent}>
        <Grid item md={12} xs={12}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={isComponentType('service')}>
        <Grid item md={6} xs={12}>
          <EntityEnvironment variant="gridItem" />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityLinksCard variant="gridItem" />
        </Grid>
      </EntitySwitch.Case>
      <EntitySwitch.Case if={isNotServiceType}>
        <Grid item md={12} xs={12}>
          <EntityLinksCard />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={isKind('resource')}>
        <Grid item md={12} xs={12}>
          <EntityLabelsCard variant="gridItem" />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={isKind('component') || isKind('api') || isKind('system')}>
        <Grid item xs={12} md={6}>
          <EntityProvidedApisCard />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityConsumedApisCard />
        </Grid>

        <Grid item md={12}>
          <EntityIssues />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>

    <EntitySwitch>
      <EntitySwitch.Case if={isKind('resource') || isKind('template') || isKind('component') || isKind('api') || isKind('system')}>
        <Grid item md={12} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
      </EntitySwitch.Case>
    </EntitySwitch>
  </Grid>
);

const ServiceEntityPage = ({ flags }) => {
  return (
    <EntityLayoutWrapper>
      <EntityLayout.Route path="/" title="Overview">
        {overviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route path="/docs" title="Docs">
        {techdocsContent}
      </EntityLayout.Route>

      <EntityLayout.Route path="/metrics" title="Metrics">
        <MetricsPage source="SERVICE" />
      </EntityLayout.Route>

      {flags?.show_tekton_tab && (
        <EntityLayout.Route path="/ci-cd" title="CI/CD (βeta)">
          <Cicd />
        </EntityLayout.Route>
      )}

      {flags?.show_vision_catalog_tab && (
        <EntityLayout.Route path="/score" title="Score">
          <VisionCatalogContent />
        </EntityLayout.Route>
      )}

      {/*       <EntityLayout.Route path="/kubernetes" title="Kubernetes">
        <EntityKubernetesContent refreshIntervalMs={30000} />
      </EntityLayout.Route> */}

      <EntityLayout.Route path="/qeta" title="Q&A">
        <QetaContent />
      </EntityLayout.Route>

    </EntityLayoutWrapper>
  );
};

const WebsiteEntityPage = ({ flags }) => {
  return (
    <EntityLayoutWrapper>
      <EntityLayout.Route path="/" title="Overview">
        {overviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route path="/docs" title="Docs">
        {techdocsContent}
      </EntityLayout.Route>

      {flags?.show_tekton_tab && (
        <EntityLayout.Route path="/ci-cd" title="CI/CD (βeta)">
          <Cicd />
        </EntityLayout.Route>
      )}

      {/*       <EntityLayout.Route path="/kubernetes" title="Kubernetes">
        <EntityKubernetesContent refreshIntervalMs={30000} />
      </EntityLayout.Route> */}

      <EntityLayout.Route path="/qeta" title="Q&A">
        <QetaContent />
      </EntityLayout.Route>

      <EntityLayout.Route path="/dependencies" title="Dependencies">
        <Grid container spacing={3} alignItems="stretch">
          <Grid item md={6}>
            <EntityDependsOnComponentsCard variant="gridItem" />
          </Grid>
          <Grid item md={6}>
            <EntityDependsOnResourcesCard variant="gridItem" />
          </Grid>
        </Grid>
      </EntityLayout.Route>
    </EntityLayoutWrapper>
  );
};

const TemplatePage = () => {
  const flags = useHoustonContext();

  return (
    <EntityLayoutWrapper>
      <EntityLayout.Route path="/" title="Overview">
        {overviewContent}
      </EntityLayout.Route>

      <EntityLayout.Route
        path="/tasks"
        title="Tasks">
        <EntityTasks />
      </EntityLayout.Route>

      {flags?.allows_manage_template && (
        <EntityLayout.Route
          path="/update-template-version"
          title="Update Template Version">
          <ManagerTemplateVersion />
        </EntityLayout.Route>
      )}

    </EntityLayoutWrapper>
  );
};


/**
 * NOTE: This page is designed to work on small screens such as mobile devices.
 * This is based on Material UI Grid. If breakpoints are used, each grid item must set the `xs` prop to a column size or to `true`,
 * since this does not default. If no breakpoints are used, the items will equitably share the asvailable space.
 * https://material-ui.com/components/grid/#basic-grid.
 */

const defaultEntityPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      {overviewContent}
    </EntityLayout.Route>

    <EntityLayout.Route path="/docs" title="Docs">
      {techdocsContent}
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

const ComponentPage = () => {
  const flags = useHoustonContext();

  return (
    <EntitySwitch>
      <EntitySwitch.Case if={isComponentType('service')}>
        <ServiceEntityPage flags={flags} />
      </EntitySwitch.Case>

      <EntitySwitch.Case if={isComponentType('website')}>
        <WebsiteEntityPage flags={flags} />
      </EntitySwitch.Case>

      <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
    </EntitySwitch>
  );
};

const apiPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <Grid item md={6} xs={12}>
          <EntityAboutCard />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid container item md={12} xs={12}>
          <Grid item md={6}>
            <EntityProvidingComponentsCard />
          </Grid>

          <Grid item md={6} xs={12}>
            <EntityConsumingComponentsCard />
          </Grid>
        </Grid>
      </Grid>
    </EntityLayout.Route>

    <EntityLayout.Route path="/definition" title="Definition">
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <EntityApiDefinitionCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

const userPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <EntityWarningContent />
        <Grid item xs={12} md={6}>
          <EntityUserProfileCard variant="gridItem" />
        </Grid>
        <Grid item xs={12} md={6}>
          <EntityOwnershipCard
            variant="gridItem"
            entityFilterKind={customEntityFilterKind}
          />
        </Grid>
        <Grid item xs={12} md={6}>
          <CustomEntityLinksCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route
      path="/tasks"
      title="Tasks">
      <EntityTasks />
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

const groupPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3}>
        <EntityWarningContent />
        <Grid item xs={12} md={12}>
          <GroupProfileCardWithLead variant="gridItem" />
        </Grid>
        <Grid item xs={12}>
          <EntityMembersListCard />
        </Grid>
        <Grid item xs={12} md={12}>
          <EntityOwnershipCard
            variant="gridItem"
            entityFilterKind={customEntityFilterKind}
          />
        </Grid>
        <Grid item xs={12} md={12}>
          <EntityLinksCard />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/metrics" title="Metrics">
      <MetricsPage source="GROUP" />
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

const systemPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <EntityWarningContent />
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item md={6}>
          <EntityHasApisCard variant="gridItem" />
        </Grid>
        <Grid item md={6}>
          <EntityHasResourcesCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>
    <EntityLayout.Route path="/diagram" title="Diagram">
      <EntityCatalogGraphCard
        variant="gridItem"
        direction={Direction.TOP_BOTTOM}
        title="System Diagram"
        height={700}
        relations={[
          RELATION_PART_OF,
          RELATION_HAS_PART,
          RELATION_API_CONSUMED_BY,
          RELATION_API_PROVIDED_BY,
          RELATION_CONSUMES_API,
          RELATION_PROVIDES_API,
          RELATION_DEPENDENCY_OF,
          RELATION_DEPENDS_ON,
        ]}
        unidirectional={false}
      />
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

const domainPage = (
  <EntityLayoutWrapper>
    <EntityLayout.Route path="/" title="Overview">
      <Grid container spacing={3} alignItems="stretch">
        <EntityWarningContent />
        <Grid item md={6}>
          <EntityAboutCard variant="gridItem" />
        </Grid>
        <Grid item md={6} xs={12}>
          <EntityCatalogGraphCard variant="gridItem" height={400} />
        </Grid>
        <Grid item md={6}>
          <EntityHasSystemsCard variant="gridItem" />
        </Grid>
      </Grid>
    </EntityLayout.Route>
  </EntityLayoutWrapper>
);

export const entityPage = (
  <EntitySwitch>
    <EntitySwitch.Case if={isKind('component')} children={<ComponentPage />} />
    <EntitySwitch.Case if={isKind('api')} children={apiPage} />
    <EntitySwitch.Case if={isKind('group')} children={groupPage} />
    <EntitySwitch.Case if={isKind('user')} children={userPage} />
    <EntitySwitch.Case if={isKind('system')} children={systemPage} />
    <EntitySwitch.Case if={isKind('domain')} children={domainPage} />
    <EntitySwitch.Case if={isKind('template')} children={<TemplatePage />} />

    <EntitySwitch.Case>{defaultEntityPage}</EntitySwitch.Case>
  </EntitySwitch>
);
