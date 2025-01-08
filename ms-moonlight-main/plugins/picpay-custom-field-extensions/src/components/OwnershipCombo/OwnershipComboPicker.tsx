/*
 * Copyright 2021 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// @ts-nocheck
import React, { useCallback, useEffect, useState } from 'react';
import { FieldExtensionComponentProps } from '@backstage/plugin-scaffolder-react';
import { ClusterPicker } from '../ClusterPicker/ClusterPicker';
import { ComponentPicker } from '../ComponentPicker';
import { StepInfo } from '../StepInfo';
import { Entity } from '@backstage/catalog-model';
import { type EntityFilterQuery } from '@backstage/catalog-client';
import { alertApiRef, useApi } from '@backstage/core-plugin-api';
import { useHoustonContext } from '@internal/plugin-picpay-houston';
import { useDebounce } from 'react-use';
import { VaultEnums } from '@internal/plugin-picpay-vault-backend';
import { githubApiRef } from '@internal/plugin-picpay-github';

/**
 * The input props that can be specified under `ui:options` for the
 * `EntityPicker` field extension.
 *
 * @public
 */
export interface OwnershipComboPickerUiOptions {
  bu?: {
    title: string;
    description: string;
    catalogFilter?: EntityFilterQuery;
    defaultKind?: string;
    defaultNamespace?: string | false;
    useDisplayName: boolean;
    allowArbitraryValues?: boolean;
    group?: {
      key: string;
    };
  };
  entity?: {
    title: string;
    description: string;
    catalogFilter?: EntityFilterQuery;
    defaultKind?: string;
    defaultNamespace?: string | false;
    allowArbitraryValues?: boolean;
    group?: {
      key: string;
    };
  };
  cluster?: {
    title: string;
    description: string;
    allowedKinds?: string[];
    allowedTypes?: string[];
    defaultKind?: string;
    defaultNamespace?: string | false;
    ignoreEntities?: string;
    allowArbitraryValues?: boolean;
    groupBy?: {
      type: string;
      values: {
        key: string;
        alias: string;
      }[];
    };
  };
  nodeAffinity?: {
    title: string;
    description: string;
    catalogFilter?: EntityFilterQuery;
    defaultKind?: string;
    defaultNamespace?: string | false;
    allowArbitraryValues?: boolean;
    group?: {
      key: string;
    };
  };
  info?: {
    text: string;
    link?: {
      text: string;
      url: string;
    };
  };
}

interface Cluster {
  [environment: string]: string;
}

export interface GroupBy {
  type?: string;
  values?: {
    key: string;
    alias: string;
  }[];
}

export interface Result {
  bu: string;
  entity?: string;
  cluster: Cluster | undefined;
  affinity: string | undefined;
  squadSre: string | undefined;
  vaultRegion: string;
  vaultExtraPath: string;
  validate_microservice: boolean;
  validate_infra: boolean;
}

/**
 * The underlying component that is rendered in the form for the `EntityPicker`
 * field extension.
 *
 * @public
 */
export const OwnershipComboPicker = (
  props: FieldExtensionComponentProps<Result, OwnershipComboPickerUiOptions>,
) => {
  const {
    onChange,
    schema,
    uiSchema,
    formData,
    formContext,
    rawErrors = [],
  } = props;

  const [selectedCluster, setSelectedCluster] = useState<
    { [key: string]: Entity } | undefined
  >();
  const [nodeAffinity, setNodeAffinity] = useState(
    uiSchema['ui:options']?.nodeAffinity,
  );
  const [githubRepositoryMicroservice, setGithubRepositoryMicroservice] =
    useState<boolean>(true);
  const [githubRepositoryInfra, setGithubRepositoryInfra] =
    useState<boolean>(true);
  const [squadSre, setSquadSre] = useState<string | any>();

  const githubApi = useApi(githubApiRef);
  const alertApi = useApi(alertApiRef);
  const flags = useHoustonContext();

  const bu = uiSchema['ui:options']?.bu;
  const entity = uiSchema['ui:options']?.entity;
  const cluster = uiSchema['ui:options']?.cluster;
  const info = uiSchema['ui:options']?.info;
  const nameMicroservice = formContext.formData.name;

  const onSelectBU = useCallback(
    (value: string, _: any, entityByBU: Entity) => {
      setSelectedCluster(undefined);
      onChange({
        ...formData,
        cluster: undefined,
        affinity: undefined,
        bu: value ?? undefined,
        squadSre: entityByBU?.spec?.squadSre.toString() ?? undefined,
        vaultRegion: VaultEnums.DEFAULT_VAULT_REGION,
        vaultExtraPath: VaultEnums.VAULT_EXTRA_PATH,
      });
      setSquadSre(entityByBU?.spec?.squadSre.toString() ?? undefined);
    },
    [onChange, formData],
  );

  const onSelectAffinity = useCallback(
    (value: string, _: any) => {
      onChange({ ...formData, affinity: value });
    },
    [onChange, formData],
  );

  const fillDependsOn = useCallback(() => {
    if (!nodeAffinity?.catalogFilter) return;
    if (!formData.cluster) {
      setNodeAffinity(p => {
        if (p?.catalogFilter) {
          (p.catalogFilter as Array<any>)[0]['spec.dependsOn'] = ['unknown'];
        }
        return p;
      });
      return;
    }

    setNodeAffinity(p => {
      if (p?.catalogFilter) {
        (p.catalogFilter as Array<any>)[0]['spec.dependsOn'] = Object.keys(
          formData.cluster,
        ).map(e => `resource:${formData.cluster[e]}`);
      }
      return p;
    });
  }, [formData, nodeAffinity]);

  const generateDummyClusterStructure = useCallback(() => {
    // if is filled, no need for dummy structure
    if (selectedCluster || !formData?.cluster) return;

    // formData.cluster has a different signature than clusterpicker formData
    // so we translate here generating a dummy structure
    // and clusterpicker fixes this on ensureImportantKeysAreFilled
    const options: { [key: string]: Entity } = {};
    Object.keys(formData.cluster).forEach(k => {
      options[k] = {
        metadata: { name: formData.cluster[k] },
        kind: '',
        apiVersion: '',
      };
    });
    setSelectedCluster(options);
  }, [formData, selectedCluster]);

  const onSelectCluster = useCallback(
    (value: { [key: string]: Entity }, _: any) => {
      if (!value) return;
      const clusters: Cluster = {};
      const keys = Object.keys(value);
      const firstChoice = value[keys[0]];
      let affinity: string | undefined;
      let vaultRegion: string = VaultEnums.DEFAULT_VAULT_REGION;
      let vaultExtraPath: string = VaultEnums.VAULT_EXTRA_PATH;

      if (nodeAffinity) {
        affinity = formData.affinity;
      } else if (
        firstChoice.metadata.labels &&
        firstChoice.metadata.labels['moonlight.picpay/short-name']
      ) {
        affinity = firstChoice.metadata.labels['moonlight.picpay/short-name'];
      } else {
        affinity = firstChoice.metadata.name;
      }

      keys.forEach(k => {
        const annotations = value[k].metadata.annotations;
        let kubernetesId = null;

        if (annotations) {
          vaultRegion = annotations['vault/region'] ?? VaultEnums.DEFAULT_VAULT_REGION;
          vaultExtraPath = annotations['vault/extra-path'] ?? VaultEnums.VAULT_EXTRA_PATH;
          kubernetesId = annotations['backstage.io/kubernetes-id'] ?? null;
        }

        clusters[k] = kubernetesId ?? value[k].metadata.name;
      });

      setSelectedCluster(value);
      onChange({
        ...formData,
        cluster: clusters,
        affinity: affinity,
        vaultRegion,
        vaultExtraPath,
      });
    },
    [onChange, nodeAffinity, setSelectedCluster, formData],
  );

  useEffect(() => {
    generateDummyClusterStructure();
  }, [formData, generateDummyClusterStructure]);

  useEffect(() => {
    fillDependsOn();
  }, [selectedCluster, fillDependsOn]);

  const validateRepositoryStartOver = useCallback(async () => {
    const getRepoGithub = async (
      repositoryMsName: string,
    ): Promise<boolean> => {
      const moonlightHomolog = window.location.href.includes('moonlight.qa.');
      let repositoryName = `ms-${repositoryMsName}`;

      if (moonlightHomolog) {
        repositoryName = `ms-test-${repositoryMsName}`;
      }

      const data = await githubApi.getRepo(repositoryName);

      if (data.error) {
        return true;
      }

      const diffDateCreatedMs =
        new Date().getTime() - new Date(data?.created_at).getTime();
      const diffDaysMs = diffDateCreatedMs / (1000 * 60 * 60 * 24) >= 1;

      return diffDaysMs && flags?.validate_repo_scaffolder ? true : false;
    };

    const url = new URLSearchParams(window.location.search);

    if (!url.has('formData')) {
      return;
    }

    try {
      const dataRepoMs = await getRepoGithub(nameMicroservice);
      setGithubRepositoryMicroservice(dataRepoMs);

      const dataRepoInfra = await getRepoGithub(`${nameMicroservice}-infra`);
      setGithubRepositoryInfra(dataRepoInfra);
    } catch (e: any) {
      alertApi.post({
        message: e,
        severity: 'error',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nameMicroservice]);

  useDebounce(
    () => {
      if (!nameMicroservice || nameMicroservice.length < 3) {
        return;
      }

      validateRepositoryStartOver();
      onChange({
        ...formData,
        validate_microservice: githubRepositoryMicroservice,
        validate_infra: githubRepositoryInfra,
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    },
    600,
    [nameMicroservice, githubRepositoryInfra, githubRepositoryMicroservice],
  );

  return (
    <>
      {entity && (
        <ComponentPicker
          {...props}
          data-testid="entity-picker"
          onChange={(e, _) => onChange({ ...formData, entity: e })}
          error={rawErrors?.length > 0 && !formData.entity}
          schema={{
            ...schema,
            title: entity?.title || 'Entity',
            description: entity?.description,
          }}
          formData={formData?.entity || ''}
          uiSchema={{ 'ui:options': entity }}
        />
      )}

      <ComponentPicker
        {...props}
        data-testid="bu-picker"
        onChangeWithEntity={onSelectBU}
        error={rawErrors?.length > 0 && !formData.bu}
        schema={{
          ...schema,
          title: bu?.title || 'BU',
          description: bu?.description,
        }}
        formData={formData?.bu || ''}
        uiSchema={{ 'ui:options': bu }}
      />

      <ClusterPicker
        {...props}
        enforceAllowedOwners
        data-testid="cluster-picker"
        onChange={onSelectCluster}
        error={rawErrors?.length > 0 && !formData.cluster}
        noOptionsText={
          formData?.bu
            ? `No pair of cluster available for BU: ${formData?.bu}`
            : 'Select the Business Unit first'
        }
        schema={{
          ...schema,
          title: cluster?.title || 'Cluster',
          description: cluster?.description,
        }}
        formData={selectedCluster || {}}
        uiSchema={{
          'ui:options': {
            ...cluster,
            allowedOwners: formData?.bu ? [formData?.bu] : [],
          },
        }}
      />

      {nodeAffinity && (
        <ComponentPicker
          {...props}
          data-testid="node-affinity-picker"
          onChange={onSelectAffinity}
          error={rawErrors?.length > 0 && !formData.affinity}
          schema={{
            ...schema,
            title: nodeAffinity?.title || 'Affinity',
            description: nodeAffinity?.description,
          }}
          formData={formData?.affinity || ''}
          uiSchema={{
            'ui:options': nodeAffinity,
          }}
        />
      )}

      {info && (
        <StepInfo
          {...props}
          formData=""
          uiSchema={{
            'ui:options': info,
          }}
        />
      )}

      {squadSre && (
        <StepInfo
          {...props}
          formData=""
          uiSchema={{
            'ui:options': {
              text: `The SRE team responsible for this BU is ${squadSre}.`,
            },
          }}
        />
      )}
    </>
  );
};
