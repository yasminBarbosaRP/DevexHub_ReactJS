import React from 'react';
import { Navigate, Route } from 'react-router';
import { apiDocsPlugin, ApiExplorerPage } from '@backstage/plugin-api-docs';
import {
  CatalogEntityPage,
  CatalogIndexPage,
  catalogPlugin,
} from '@backstage/plugin-catalog';
import {
  CatalogImportPage,
  catalogImportPlugin,
} from '@backstage/plugin-catalog-import';
import { ScaffolderPage, scaffolderPlugin } from '@backstage/plugin-scaffolder';
import { ScaffolderFieldExtensions } from '@backstage/plugin-scaffolder-react';
import { SearchPage } from '@backstage/plugin-search';
import { searchPage } from './components/search/SearchPage';
import { TechRadarPage } from '@backstage-community/plugin-tech-radar';
import {
  TechDocsIndexPage,
  TechDocsReaderPage,
  techdocsPlugin,
} from '@backstage/plugin-techdocs';
import {
  UserSettingsPage,
  SettingsLayout,
} from '@backstage/plugin-user-settings';
import { apis } from './apis';
import { entityPage } from './components/catalog/EntityPage';
import { Root } from './components/Root';
import { AlertDisplay, OAuthRequestDialog } from '@backstage/core-components';
import { createApp } from '@backstage/app-defaults';
import { AppRouter, FlatRoutes } from '@backstage/core-app-api';
import { NpsDialog } from '@internal/plugin-picpay-nps';
import { MicrosoftAuthComponent } from './components/microsoft-auth/MicrosoftAuth';
import { Alert } from '@material-ui/lab';
import { configApiRef, useApi } from '@backstage/core-plugin-api';
import { orgPlugin } from '@backstage/plugin-org';
import { darkTheme, lightTheme } from './theme';
import { ReportsPage } from '@internal/plugin-picpay-reports';
import {
  CatalogGraphPage,
  catalogGraphPlugin,
} from '@backstage/plugin-catalog-graph';
import {
  RELATION_CONSUMES_API,
  RELATION_OWNED_BY,
  RELATION_OWNER_OF,
  RELATION_API_CONSUMED_BY,
  RELATION_PROVIDES_API,
  RELATION_API_PROVIDED_BY,
  RELATION_HAS_PART,
  RELATION_PART_OF,
  RELATION_DEPENDS_ON,
  RELATION_DEPENDENCY_OF,
} from '@backstage/catalog-model';
import { DevToolsPage } from '@backstage/plugin-devtools';
import { devToolsInfoReadPermission } from '@backstage/plugin-devtools-common';
import { CatalogUnprocessedEntitiesPage } from '@backstage/plugin-catalog-unprocessed-entities';
import { ExplorePage } from '@backstage-community/plugin-explore';
import * as plugins from './plugins';
import { TechDocsAddons } from '@backstage/plugin-techdocs-react';
import { ReportIssue } from '@backstage/plugin-techdocs-module-addons-contrib';
import { customDevToolsPage } from './components/devtools/CustomDevToolsPage';
import { AdvancedSettings } from './components/advancedSettings';
import { Sanctuary2Page } from '@internal/plugin-picpay-sanctuary2';
import { HistoryPage } from '@internal/plugin-picpay-history';
import { PicpayHomePage } from '@internal/plugin-picpay-home';
import {
  OwnershipComboPickerFieldExtension,
  ClusterPickerFieldExtension,
  ComponentPickerFieldExtension,
  StepInfoFieldExtension,
  EntityComboPickerFieldExtension,
  RepoBranchFieldExtension,
  EntitiesPickerFieldExtension,
  UrlDataFieldExtension,
  NunjucksBlockerFieldExtension
} from '@internal/plugin-picpay-custom-field-extensions';
import { CustomTemplateCard } from './components/customTemplateCardScaffolder';
import { HoustonProvider } from '@internal/plugin-picpay-houston';
import BootErrorPage from './BootErrorPage';
import { PicpayToolsPage } from '@internal/plugin-picpay-tools';
import { CustomCatalogIndexPage } from './components';
import { AnnouncementsPage } from '@internal/plugin-picpay-announcements';
import { TemplateRenderProvider, UserGroupsProvider } from '@internal/plugin-picpay-commons';
import { importPage } from './components/importPage/ImportPage';
import { QetaPage } from '@drodil/backstage-plugin-qeta';
import { qetaReadPermission } from '@drodil/backstage-plugin-qeta-common'
import { CustomRequirePermission } from './components/customPermissionPage/CustomRequirePermission';
import { PluginGithubPage } from '@internal/plugin-picpay-github';
import { ManageTemplateVersionPage } from '@internal/plugin-picpay-manage-template-version';
import { MetricsPage } from './components/metrics/MetricsPage';

const routes = (
  <FlatRoutes>
    <Navigate key="/" to="/home" />
    <Route path="/home" element={<PicpayHomePage />} />
    <Route
      path="/catalog"
      element={
        <CustomCatalogIndexPage pagination initiallySelectedFilter="all" />
      }
    />
    <Route path="/explore" element={<ExplorePage />} />
    <Route
      path="/catalog/:namespace/:kind/:name"
      element={<CatalogEntityPage />}
    >
      {entityPage}
    </Route>
    <Route path="/docs" element={<TechDocsIndexPage />} />
    {/*    <DefaultTechDocsHome />*/}
    {/* </Route>Route*/}
    <Route
      path="/docs/:namespace/:kind/:name/*"
      element={<TechDocsReaderPage />}
    >
      {/* techDocsPage */}
      <TechDocsAddons>
        {/* <ExpandableNavigation /> */}
        <ReportIssue />
        {/* <TextSize /> */}
      </TechDocsAddons>
    </Route>
    <Route
      path="/create"
      element={
        <ScaffolderPage
          components={{ TemplateCardComponent: CustomTemplateCard }}
          contextMenu={{
            tasks: false
          }}
          groups={[
            {
              title: 'Microservice',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'microservice',
            },
            {
              title: 'Development',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'development',
            },
            {
              title: 'Quality',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'quality',
            },
            {
              title: 'Infrastructure',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() ===
                'infrastructure',
            },
            {
              title: 'Data',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'data',
            },
            {
              title: 'Update',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'update',
            },
            {
              title: 'Blueprint',
              filter: entity =>
                entity?.spec?.type?.toString().toLowerCase() === 'blueprint',
            },
          ]}
        />
      }
    >
      <ScaffolderFieldExtensions>
        <ComponentPickerFieldExtension />
        <UrlDataFieldExtension />
        <NunjucksBlockerFieldExtension />
        <ClusterPickerFieldExtension />
        <OwnershipComboPickerFieldExtension />
        <EntityComboPickerFieldExtension />
        <StepInfoFieldExtension />
        <RepoBranchFieldExtension />
        <EntitiesPickerFieldExtension />
      </ScaffolderFieldExtensions>
    </Route>
    <Route path="/api-docs" element={<ApiExplorerPage />} />
    <Route
      path="/tech-radar"
      element={<TechRadarPage width={1500} height={800} />}
    />
    <Route path="/catalog-import" element={<CatalogImportPage />}>
      {importPage}
    </Route>
    <Route path="/catalog-index" element={<CatalogIndexPage />} />
    <Route path="/search" element={<SearchPage />}>
      {searchPage}
    </Route>
    <Route path="/settings" element={<UserSettingsPage />}>
      <SettingsLayout.Route path="/advanced" title="Advanced">
        <AdvancedSettings />
      </SettingsLayout.Route>
    </Route>
    {/* <Route path="/xcmetrics" element={<XcmetricsPage />} /> */}
    <Route path="/reports" element={<ReportsPage />} />
    <Route path="/management/:id" element={<Sanctuary2Page />} />
    <Route
      path="/catalog-graph"
      element={
        <CatalogGraphPage
          initialState={{
            selectedKinds: ['component', 'domain', 'system', 'api', 'group'],
            selectedRelations: [
              RELATION_OWNER_OF,
              RELATION_OWNED_BY,
              RELATION_CONSUMES_API,
              RELATION_API_CONSUMED_BY,
              RELATION_PROVIDES_API,
              RELATION_API_PROVIDED_BY,
              RELATION_HAS_PART,
              RELATION_PART_OF,
              RELATION_DEPENDS_ON,
              RELATION_DEPENDENCY_OF,
            ],
          }}
        />
      }
    />
    <Route path="/history" element={<HistoryPage />} />
    <Route path="/tools" element={<PicpayToolsPage />} />
    <Route path="/announcements" element={<AnnouncementsPage />} />
    <Route path="/catalog-unprocessed-entities" element={<CatalogUnprocessedEntitiesPage />} />;
    <Route path="/moonlight-info"
      element={
        <CustomRequirePermission permission={devToolsInfoReadPermission}>
          <DevToolsPage />
        </CustomRequirePermission>
      }>
      {customDevToolsPage}
    </Route>
    <Route path="/qeta"
      element={
        <CustomRequirePermission permission={qetaReadPermission} >
          <QetaPage title="Questions" />
        </CustomRequirePermission>

      } />
    <Route path="/plugin-github" element={<PluginGithubPage />} />
    <Route path="/manage-template-version" element={<ManageTemplateVersionPage />} />
    <Route path="/tech-metrics" element={<MetricsPage />} />
  </FlatRoutes>
);

const EnvironmentReadAlert = () => {
  const configApi = useApi(configApiRef);
  const backendUrl = configApi.getString('backend.baseUrl');
  if (window.location.href.includes('.qa.') || backendUrl.includes('.qa.')) {
    return (
      <Alert
        variant="filled"
        style={{ width: '100%', justifyContent: 'center' }}
        severity="error"
      >
        You are in the <b>TEST (QA)</b> environment. Do not create or delete any
        Component here! Please{' '}
        <a href="https://moonlight.limbo.work/">
          <u>CLICK HERE</u>
        </a>{' '}
        to go to the PRODUCTION environment.{' '}
      </Alert>
    );
  }
  return <></>;
};

const app = createApp({
  apis,
  themes: [darkTheme, lightTheme],
  plugins: Object.values(plugins),
  bindRoutes({ bind }) {
    bind(catalogPlugin.externalRoutes, {
      createComponent: scaffolderPlugin.routes.root,
      viewTechDoc: techdocsPlugin.routes.docRoot,
      createFromTemplate: scaffolderPlugin.routes.selectedTemplate,
    });
    bind(apiDocsPlugin.externalRoutes, {
      registerApi: scaffolderPlugin.routes.root,
    });
    bind(scaffolderPlugin.externalRoutes, {
      registerComponent: catalogImportPlugin.routes.importPage,
      viewTechDoc: techdocsPlugin.routes.docRoot,
    });
    bind(orgPlugin.externalRoutes, {
      catalogIndex: catalogPlugin.routes.catalogIndex,
    });
    bind(catalogGraphPlugin.externalRoutes, {
      catalogEntity: catalogPlugin.routes.catalogEntity,
    });
  },
  components: {
    SignInPage: MicrosoftAuthComponent,
    BootErrorPage: BootErrorPage,
  },
});

const App = app.createRoot(
  <>
    <HoustonProvider>
      <UserGroupsProvider>
        <TemplateRenderProvider>
          <AlertDisplay />
          <EnvironmentReadAlert />
          <OAuthRequestDialog />
          <NpsDialog />
          <AppRouter>
            <Root>{routes}</Root>
          </AppRouter>
        </TemplateRenderProvider>
      </UserGroupsProvider>
    </HoustonProvider>
  </>
);

export default App;
