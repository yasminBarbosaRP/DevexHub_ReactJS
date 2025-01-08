import { HostDiscovery } from '@backstage/backend-common';
import { CatalogClient } from '@backstage/catalog-client';
import {
  createRouter,
  createBuiltinActions,
} from '@backstage/plugin-scaffolder-backend';
import { createRouter as customTasksRouter } from '@internal/plugin-picpay-tasks-backend';

import { Router } from 'express';
import type { PluginEnvironment } from '../types';
import {
  GithubCredentialsProvider,
  ScmIntegrations,
} from '@backstage/integration';
import got from 'got';
import { createNewEcrRepoAction } from '@internal/plugin-picpay-scaffolder-aws-backend';
import {
  createWriterAction,
  checkAlreadyIsOnMoonlight,
  readFileAction,
  createEnvsAction,
  createJsonMergeAction,
  createJsonParseAction,
  createYamlParseAction
} from '@internal/plugin-picpay-scaffolder-commons-backend';
import {
  createOpsdashAction,
  createVaultAction,
} from '@internal/plugin-picpay-scaffolder-envvar-backend';
import { createSonarProjectAction } from '@internal/plugin-picpay-scaffolder-sonar-backend';
import { createObservabilityProjectAction } from '@internal/plugin-picpay-scaffolder-observability-backend';
import { mergeContentAction } from '@internal/plugin-picpay-scaffolder-merge-content-backend';
import { httpRequestAction } from '@internal/plugin-picpay-http-request-backend';
import { copyHelmchartsToArgoCdAction } from '@internal/plugin-picpay-scaffolder-copy-helm-agorcd-backend';
import { gitChangeDirectoryAction } from '@internal/plugin-picpay-scaffolder-git-change-directory-backend';
import {
  argoRolloutAdoption,
  clusterDiscovery,
  rolloutsInstall
} from '@internal/backstage-plugin-picpay-argo-rollouts-replica-checker-backend';
import {
  pushToBranchAction,
  createHelmchartsAction,
  updateBranchProtection,
  picpayRepositoryVisibility,
  updateInfraHelmchartsAction,
  createBranchAction,
  deleteWebhookAction,
} from '@internal/plugin-picpay-scaffolder-github-backend';
import {
  k8sIdentifyNamespaceAction,
  listNamespaces,
} from '@internal/plugin-picpay-scaffolder-k8s-backend';
import { identifyCiTypeAction } from '@internal/plugin-picpay-scaffolder-identify-ci-backend';
import { identifyDeployTypeAction } from '@internal/plugin-picpay-scaffolder-identify-cd-backend';
import { discoveryVersionHelmAtion } from '@internal/plugin-picpay-scaffolder-get-version-helm-backend';
import { validationGateAction } from '@internal/plugin-picpay-scaffolder-validation-gate-backend';
import { entityRepositoryAction } from '@internal/plugin-picpay-scaffolder-entity-repository-backend';
import { dockerEntrypointAction } from '@internal/plugin-picpay-scaffolder-docker-entrypoint-backend';
import { updateHelmcharts } from '@internal/plugin-picpay-scaffolder-update-hemlcharts-migrate-cluster-backend';
import { migrateServiceFromLegacyClusterToNew } from '@internal/plugin-picpay-scaffolder-delivery-migrate-provider-backend';
import { migrateClusterInfoAction } from '@internal/plugin-picpay-scaffolder-info-cluster-migration-backend';
import { harnessClusterIdentidy } from '@internal/plugin-picpay-scaffolder-harness-cluster-discovery-backend';
import {
  validateStructureAction,
  validateWebhookAction,
} from '@internal/plugin-picpay-scaffolder-validate-alfred-backend';
import {
  createZipAction,
  createSleepAction,
  createWriteFileAction,
  createAppendFileAction,
  createMergeJSONAction,
  createMergeAction,
  createParseFileAction,
  createSerializeYamlAction,
  createSerializeJsonAction,
  createJSONataAction,
  createYamlJSONataTransformAction,
  createJsonJSONataTransformAction,
  createReplaceInFileAction,
} from '@roadiehq/scaffolder-backend-module-utils';
import { templatesIntermediatorAction } from '@internal/plugin-picpay-scaffolder-templates-intermediator-backend';
import { getFileAction } from '@internal/plugin-picpay-scaffolder-github-backend';
import { PicPayGithubCredentialsProvider } from '@internal/plugin-picpay-github-backend';
import { JsonValue } from '@backstage/types';
import { dumpYaml, loadAllYaml } from '@kubernetes/client-node';

export default async function createPlugin({
  logger,
  config,
  database,
  reader,
  scheduler,
}: PluginEnvironment): Promise<Router> {
  const discovery = HostDiscovery.fromConfig(config);
  const catalogClient = new CatalogClient({ discoveryApi: discovery });

  const integrations = ScmIntegrations.fromConfig(config);
  const builtInActions = createBuiltinActions({
    integrations,
    config,
    catalogClient,
    reader,
  });

  const githubCredentialsProvider: GithubCredentialsProvider =
    PicPayGithubCredentialsProvider.fromIntegrations(integrations);

  const actions = [
    ...builtInActions,
    createZipAction(),
    createSleepAction(),
    createWriteFileAction(),
    createAppendFileAction(),
    createMergeJSONAction({}),
    createMergeAction(),
    createParseFileAction(),
    createSerializeYamlAction(),
    createSerializeJsonAction(),
    createJSONataAction(),
    createYamlJSONataTransformAction(),
    createJsonJSONataTransformAction(),
    createNewEcrRepoAction(),
    createReplaceInFileAction(),
    updateBranchProtection(integrations, githubCredentialsProvider),
    picpayRepositoryVisibility(integrations, githubCredentialsProvider),
    createHelmchartsAction(integrations, reader, githubCredentialsProvider),
    pushToBranchAction(integrations, githubCredentialsProvider),
    createBranchAction(integrations, githubCredentialsProvider),
    deleteWebhookAction(integrations, githubCredentialsProvider),
    createWriterAction(),
    createOpsdashAction(),
    readFileAction(),
    createVaultAction(config),
    createSonarProjectAction(integrations, githubCredentialsProvider),
    createObservabilityProjectAction(integrations, githubCredentialsProvider),
    checkAlreadyIsOnMoonlight(integrations, githubCredentialsProvider),
    mergeContentAction(integrations, githubCredentialsProvider),
    copyHelmchartsToArgoCdAction(
      integrations,
      reader,
      githubCredentialsProvider,
    ),
    gitChangeDirectoryAction(integrations, githubCredentialsProvider),
    updateInfraHelmchartsAction(
      integrations,
      reader,
      githubCredentialsProvider,
    ),
    httpRequestAction(),
    createEnvsAction(),
    createJsonMergeAction(),
    createJsonParseAction(),
    createYamlParseAction(),
    getFileAction(integrations, githubCredentialsProvider),
    validationGateAction(),
    entityRepositoryAction(catalogClient),
    k8sIdentifyNamespaceAction(listNamespaces),
    dockerEntrypointAction(integrations, githubCredentialsProvider),
    identifyCiTypeAction(integrations, githubCredentialsProvider),
    identifyDeployTypeAction(got.extend()),
    discoveryVersionHelmAtion(integrations, githubCredentialsProvider),
    updateHelmcharts(integrations, githubCredentialsProvider),
    migrateServiceFromLegacyClusterToNew(
      integrations,
      catalogClient,
      githubCredentialsProvider,
    ),
    migrateClusterInfoAction(),
    harnessClusterIdentidy(integrations, githubCredentialsProvider),
    validateStructureAction(integrations, reader),
    validateWebhookAction(integrations, githubCredentialsProvider),
    templatesIntermediatorAction(
      integrations,
      githubCredentialsProvider,
      catalogClient,
    ),
    argoRolloutAdoption(integrations, githubCredentialsProvider),
    clusterDiscovery(integrations, githubCredentialsProvider),
    rolloutsInstall(integrations, githubCredentialsProvider),
  ];

  const r = await createRouter({
    logger,
    config,
    database,
    catalogClient,
    reader,
    actions,
    additionalTemplateFilters: {
      extract: (value: JsonValue, pattern: JsonValue): string | null => {
        let newValue = value;
        if (typeof value === 'object') {
          newValue = JSON.stringify(value);
        }
        if (typeof newValue !== 'string' || typeof pattern !== 'string') return null;
        const match = newValue.match(new RegExp(pattern));
        return match ? match[1] || match[0] : null;
      },
      parseJson: (value: JsonValue) => {
        if (typeof value === 'string') {
          return JSON.parse(value);
        }
        if (typeof value === 'object') {
          return value;
        }
        return null;
      },
      parseJsonOrYaml: (value: JsonValue) => {
        if (typeof value === 'string') {
          try {
            return JSON.parse(value);
          } catch {
            try {
              return loadAllYaml(value);
            } catch {
              return null;
            }
          }
        }
        if (typeof value === 'object') {
          return value;
        }
        return null;
      },
      toYAML: (value: JsonValue) => {
        if (typeof value === 'string') {
          return loadAllYaml(value);
        }
        if (typeof value === 'object') {
          return dumpYaml(value);
        }
        return null;
      },
    },
    scheduler
  });

  const routerExtension = await customTasksRouter({ database: await database.getClient(), logger })
  r.use(routerExtension);
  return r;
}
