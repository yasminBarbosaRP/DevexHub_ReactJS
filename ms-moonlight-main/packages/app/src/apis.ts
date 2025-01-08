import {
  ScmIntegrationsApi,
  scmIntegrationsApiRef,
  ScmAuth,
} from '@backstage/integration-react';
import {
  AnyApiFactory,
  configApiRef,
  createApiFactory,
  analyticsApiRef,
  identityApiRef,
  discoveryApiRef,
  fetchApiRef,
  gitlabAuthApiRef,
  googleAuthApiRef,
  microsoftAuthApiRef,
  oktaAuthApiRef,
  oneloginAuthApiRef,
} from '@backstage/core-plugin-api';
import { NpsApiClient, NpsApiRef } from '@internal/plugin-picpay-nps';
import {
  CatalogReportApiRef,
  CatalogReportClient,
} from '@internal/plugin-picpay-reports';
import {
  Sanctuary2ApiClient,
  Sanctuary2ApiRef,
} from '@internal/plugin-picpay-sanctuary2';
import { HomeApiClient, HomeApiRef } from '@internal/plugin-picpay-home';
import { HistoryApi, HistoryApiRef } from '@internal/plugin-picpay-history';
import {
  ArgoCDApiClient,
  ArgoCDApiRef,
} from '@internal/plugin-picpay-custom-field-extensions';
import {
  TasksClient,
  TasksApiRef,
} from '@internal/plugin-picpay-tasks';
import { PicpayTechRadarClient } from './lib/PicpayTechRadarClient';
import { techRadarApiRef } from '@backstage-community/plugin-tech-radar';
import {
  HoustonApiClient,
  houstonApiRef,
} from '@internal/plugin-picpay-houston';
import { ToolsClient, toolsApiRef } from '@internal/plugin-picpay-tools';
import {
  EntityTreeApiClient,
  entityTreeApiRef,
} from '@internal/plugin-picpay-entity-tree';
import {
  RepositorySettingsApiClient,
  RepositorySettingsApiRef,
} from '@internal/plugin-picpay-repository-settings';
import { apiDocsConfigRef } from '@backstage/plugin-api-docs';
import ApiDocs from './components/apiDocs/ApiDocs';
import { VisionApiClient, visionApiRef } from '@internal/plugin-picpay-vision';
import {
  MetricsApiClient,
  metricsApiRef,
  PullRequestsApiClient,
  pullRequestsApiRef
} from '@internal/plugin-picpay-metrics';
import {
  refreshStateApiRef,
  EntityRefreshState,
} from '@internal/plugin-picpay-entity-refresh-status';
import {
  KubernetesAuthProviders,
  KubernetesBackendClient,
  KubernetesProxyClient,
  kubernetesApiRef,
  kubernetesAuthProvidersApiRef,
  kubernetesProxyApiRef,
} from '@backstage/plugin-kubernetes';
import { AdditionalInformationApiClient, InfoApiClient, InfoApiRef, additionalInformationApiRef } from '@internal/plugin-picpay-commons';
import { GithubApiClient, githubApiRef } from '@internal/plugin-picpay-github';
import { GoogleAnalytics4 } from '@backstage-community/plugin-analytics-module-ga4';
import { ManageTemplateVersionApiClient, ManageTemplateVersionApiRef } from '@internal/plugin-picpay-manage-template-version';

export const apis: AnyApiFactory[] = [
  createApiFactory({
    api: scmIntegrationsApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => ScmIntegrationsApi.fromConfig(configApi),
  }),

  createApiFactory({
    api: kubernetesApiRef,
    deps: {
      discoveryApi: discoveryApiRef,
      fetchApi: fetchApiRef,
      kubernetesAuthProvidersApi: kubernetesAuthProvidersApiRef,
    },
    factory: ({ discoveryApi, fetchApi, kubernetesAuthProvidersApi }) =>
      new KubernetesBackendClient({
        discoveryApi,
        fetchApi,
        kubernetesAuthProvidersApi,
      }),
  }),
  createApiFactory({
    api: kubernetesProxyApiRef,
    deps: {
      kubernetesApi: kubernetesApiRef,
    },
    factory: ({ kubernetesApi }) =>
      new KubernetesProxyClient({
        kubernetesApi,
      }),
  }),
  createApiFactory({
    api: kubernetesAuthProvidersApiRef,
    deps: {
      gitlabAuthApi: gitlabAuthApiRef,
      googleAuthApi: googleAuthApiRef,
      microsoftAuthApi: microsoftAuthApiRef,
      oktaAuthApi: oktaAuthApiRef,
      oneloginAuthApi: oneloginAuthApiRef,
    },
    factory: ({
      gitlabAuthApi,
      googleAuthApi,
      microsoftAuthApi,
      oktaAuthApi,
      oneloginAuthApi,
    }) => {
      const oidcProviders = {
        gitlab: gitlabAuthApi,
        google: googleAuthApi,
        microsoft: microsoftAuthApi,
        okta: oktaAuthApi,
        onelogin: oneloginAuthApi,
      };

      return new KubernetesAuthProviders({
        microsoftAuthApi,
        googleAuthApi,
        oidcProviders,
      });
    },
  }),

  createApiFactory({
    api: analyticsApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      GoogleAnalytics4.fromConfig(configApi, {
        identityApi,
      }),
  }),
  createApiFactory({
    api: NpsApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new NpsApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: ArgoCDApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new ArgoCDApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: TasksApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) =>
      new TasksClient({ configApi }),
  }),
  createApiFactory({
    api: Sanctuary2ApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new Sanctuary2ApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: HomeApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new HomeApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: CatalogReportApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) =>
      new CatalogReportClient({
        configApi,
      }),
  }),
  createApiFactory({
    api: HistoryApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new HistoryApi({
        configApi,
        identityApi,
      }),
  }),
  createApiFactory({
    api: metricsApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new MetricsApiClient({
        configApi,
        identityApi,
      }),
  }),
  createApiFactory({
    api: pullRequestsApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new PullRequestsApiClient({
        configApi,
        identityApi,
      }),
  }),
  createApiFactory({
    api: InfoApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new InfoApiClient({
        configApi,
        identityApi,
      }),
  }),
  createApiFactory({
    api: techRadarApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      PicpayTechRadarClient.fromConfig(configApi, identityApi),
  }),
  createApiFactory({
    api: houstonApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new HoustonApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: refreshStateApiRef,
    deps: { configApi: configApiRef },
    factory: ({ configApi }) => new EntityRefreshState(configApi),
  }),
  createApiFactory({
    api: entityTreeApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new EntityTreeApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: toolsApiRef,
    deps: { discoveryApi: discoveryApiRef, fetchApi: fetchApiRef },
    factory: ({ discoveryApi, fetchApi }) =>
      new ToolsClient({
        discoveryApi,
        fetchApi,
      }),
  }),
  createApiFactory({
    api: apiDocsConfigRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) => {
      const cl = new ApiDocs(configApi, identityApi);
      return cl.getApiDocsConfig();
    },
  }),
  createApiFactory({
    api: RepositorySettingsApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new RepositorySettingsApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: visionApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new VisionApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: githubApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new GithubApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: ManageTemplateVersionApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new ManageTemplateVersionApiClient({ configApi, identityApi }),
  }),
  createApiFactory({
    api: additionalInformationApiRef,
    deps: { configApi: configApiRef, identityApi: identityApiRef },
    factory: ({ configApi, identityApi }) =>
      new AdditionalInformationApiClient({ configApi, identityApi }),
  }),

  ScmAuth.createDefaultApiFactory(),
];
