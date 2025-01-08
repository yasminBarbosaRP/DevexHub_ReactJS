import React, { useCallback, useEffect, useState } from 'react';
import { Alert } from '@material-ui/lab';
import {
  CatalogApi,
  catalogApiRef,
  useEntity,
} from '@backstage/plugin-catalog-react';
import { alertApiRef, useAnalytics, useApi } from '@backstage/core-plugin-api';
import { scaffolderApiRef } from '@backstage/plugin-scaffolder-react';
import { entityTreeApiRef } from '@internal/plugin-picpay-entity-tree';
import { Entity } from '@backstage/catalog-model';
import MaterialLink from '@material-ui/core/Link';
import { Link as RouterLink } from 'react-router-dom';
import { ConfirmationModal } from '@internal/plugin-picpay-commons';

export const ANNOTATION_CLUSTER_HOM = 'moonlight.picpay/cluster-hom';
export const ANNOTATION_CLUSTER_PRD = 'moonlight.picpay/cluster-prd';

export enum CardError {
  NoError,
  ClusterNotFound,
  ClusterNotLinked,
}

export const getCardType = async (entity: Entity, catalogApi: CatalogApi) => {
  const ann = entity?.metadata?.annotations ?? {};

  if (
    (!ann[ANNOTATION_CLUSTER_HOM] && !ann[ANNOTATION_CLUSTER_PRD]) ||
    (ann[ANNOTATION_CLUSTER_HOM] && ann[ANNOTATION_CLUSTER_PRD])
  ) {
    return CardError.NoError;
  }

  const nameClusterPrd = ann[ANNOTATION_CLUSTER_HOM].replace('-hom', '-prd');

  const { items } = await catalogApi.getEntities({
    fields: ['metadata.name'],
    filter: {
      'metadata.name': nameClusterPrd,
      'spec.type': 'eks',
    },
  });

  if (items.length > 0 && !ann[ANNOTATION_CLUSTER_PRD]) {
    return CardError.ClusterNotLinked;
  }

  if (ann[ANNOTATION_CLUSTER_HOM] && !ann[ANNOTATION_CLUSTER_PRD]) {
    return CardError.ClusterNotFound;
  }

  return CardError.NoError;
};

export const showEnvironmentError = async (
  entity: Entity,
  catalogApi: CatalogApi,
) => {
  return (await getCardType(entity, catalogApi)) !== CardError.NoError;
};

export const ProdEnvironmentWarning = () => {
  const { entity } = useEntity();

  const scaffolderApi = useApi(scaffolderApiRef);
  const entityTreeApi = useApi(entityTreeApiRef);
  const alertApi = useApi(alertApiRef);
  const catalogApi = useApi(catalogApiRef);
  const analytics = useAnalytics();
  const [cardType, setCardType] = useState(CardError.NoError);

  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    (async () => {
      setCardType(await getCardType(entity, catalogApi));
    })();
  }, [entity, catalogApi, setCardType]);

  const linkEnvironment = useCallback(async () => {
    const buName = await entityTreeApi.getBUNameByEntity(entity);
    const annotations = entity?.metadata?.annotations ?? {};

    const { taskId } = await scaffolderApi.scaffold({
      templateRef:
        'template:default/moonlight-template-microservice-complement-prd',
      values: {
        name: entity.metadata.name.startsWith('ms-')
          ? entity.metadata.name.substring(3)
          : entity.metadata.name,
        ownership: {
          bu: buName,
          cluster: {
            production: annotations[ANNOTATION_CLUSTER_HOM].replace(
              '-hom',
              '-prd',
            ),
          },
        },
      },
    });

    alertApi.post({
      message: 'Process started successfully',
      severity: 'info',
      display: 'transient',
    });

    open(`/create/tasks/${taskId}`, '_blank');
  }, [entity, alertApi, entityTreeApi, scaffolderApi]);

  const handleClick = () => {
    analytics.captureEvent('click', 'No Environments found', {
      attributes: {
        to: 'https://picpay.atlassian.net/wiki/spaces/MOON/pages/2418344061/Como+configurar+o+servi+o',
      },
    });
  };

  return (
    <>
      {cardType === CardError.ClusterNotFound && (
        <Alert
          severity="warning"
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          Production environment not found for this component!{' '}
          <MaterialLink
            component={RouterLink}
            to="https://picpay.atlassian.net/wiki/spaces/IC/pages/3234365817/Como+fa+o+para+solicitar+um+cluster+EKS"
            onClick={handleClick}
            target="_blank"
          >
            Click here to know how to change that.
          </MaterialLink>
        </Alert>
      )}

      {cardType === CardError.ClusterNotLinked && (
        <Alert
          variant="filled"
          style={{
            width: '100%',
            justifyContent: 'center',
            alignItems: 'center',
            cursor: 'pointer',
          }}
          severity="warning"
          onClick={() => setConfirmationOpen(p => !p)}
        >
          Environment of this Component is not complete! Click here to complete
          your production environment.
        </Alert>
      )}

      <ConfirmationModal
        onConfirm={linkEnvironment}
        onClose={() => setConfirmationOpen(false)}
        open={confirmationOpen}
        body={
          <>
            Are you sure you would like to finalize the environment setup for
            the <b>{entity.metadata.name}</b> component?
          </>
        }
      />
    </>
  );
};
