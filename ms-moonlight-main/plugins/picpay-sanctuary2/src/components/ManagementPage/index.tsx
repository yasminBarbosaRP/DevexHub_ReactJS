import React, { useCallback, useEffect, useState } from 'react';
import { Header, Page, Content } from '@backstage/core-components';
import { Entity, Management } from '../Management';
import { useNavigate, useParams } from 'react-router';
import { useApi } from '@backstage/core-plugin-api';
import { Sanctuary2ApiRef } from '../../api';
import { StatusResponse } from '../../models';
import { EntityProvider, catalogApiRef } from '@backstage/plugin-catalog-react';

export const ManagementPage = () => {
  const { id } = useParams() as { id: string };

  const api = useApi(Sanctuary2ApiRef);
  const catalogApi = useApi(catalogApiRef);
  const navigate = useNavigate();

  const [title, setTitle] = useState('History');
  const [status, setStatus] = useState<StatusResponse | undefined>();
  const [entity, setEntity] = useState<Entity | undefined | null>(null);

  const getStatus = useCallback(() => {
    setTitle('History');
    setEntity(undefined);
    setStatus(undefined);

    api
      .getStatusByID(id)
      .then(statusResp => {
        if (statusResp.error) {
          return Promise.reject();
        }

        setTitle(statusResp.component.name);
        setStatus(statusResp);

        return Promise.resolve();
      })
      .catch(async () => {
        const { items } = await catalogApi.getEntities({
          fields: ['metadata.uid', 'metadata.name'],
          filter: { 'metadata.name': id },
        });

        if (items?.length && items[0].metadata?.uid) {
          const res = await api.getStatus(items[0].metadata?.uid, items[0].kind);

          if (!res.error) {
            setTitle(res.component.name);
            setStatus(res);
            setEntity({
              id: `${items[0].metadata?.uid || ''}`,
              name: `${items[0].metadata?.name || ''}`,
              kind: `${items[0].kind || 'Component'}`,
            });
            return;
          }
        }

        navigate('/not_found');
      });
  }, [api, id, catalogApi, navigate]);

  useEffect(getStatus, [getStatus]);

  return (
    <Page themeId="tool">
      <Header title={title} />
      <Content>
        <EntityProvider
          entity={{ apiVersion: '', kind: '', metadata: { name: '' } }}
        >
          <Management status={status} entity={entity} />
        </EntityProvider>
      </Content>
    </Page>
  );
};
