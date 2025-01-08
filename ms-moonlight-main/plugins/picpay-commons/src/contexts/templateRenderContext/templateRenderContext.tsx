import React, { createContext, useCallback, useEffect, useState, ReactNode } from 'react';
import nunjucks from 'nunjucks';
import { alertApiRef, configApiRef, identityApiRef, useApi } from '@backstage/core-plugin-api';
import { catalogApiRef } from '@backstage/plugin-catalog-react';
import { additionalInformationApiRef } from '../../apis/additionalInformation';
import { Entity } from '@backstage/catalog-model';
import { useHoustonContext } from '@internal/plugin-picpay-houston';

const njucks = nunjucks.configure({
  throwOnUndefined: true,
  autoescape: false,
});

interface TemplateContextType {
  extractIdentityValue: (template: string, throwException?: boolean, extraContext?: object) => string;
  loading: boolean;
  processItem: (item: any) => any;
  identity?: Entity;
  adGroup?: any;
}

export const TemplateContext = createContext<TemplateContextType>({
  extractIdentityValue: (template) => template,
  loading: false,
  processItem: (item: any) => item,
  identity: undefined,
  adGroup: undefined,
});

interface TemplateRenderProviderProps {
  children: ReactNode;
}

export const TemplateRenderProvider: React.FC<TemplateRenderProviderProps> = ({ children }) => {
  const catalogApi = useApi(catalogApiRef);
  const identityApi = useApi(identityApiRef);
  const alertApi = useApi(alertApiRef);
  const config = useApi(configApiRef);
  const group = useApi(additionalInformationApiRef);
  const flags = useHoustonContext();

  const [adGroup, setAdGroup] = useState<any>(undefined);
  
  const [identity, setIdentity] = useState<Entity | undefined>(undefined);
  const [loading, setLoading] = useState<boolean>(true);
  const [hasFetched, setHasFetched] = useState(false);

  const getAdditionalInformation = useCallback(async (entityRef: string): Promise<any[]> => {
    try {
      const adGroupResponse = await group.getByEntityRef(entityRef);
      if (!adGroupResponse || adGroupResponse.length === 0) return [];

      return adGroupResponse.map((data) => {
        if (typeof data.content === 'string') {
          return {
            id: data.id,
            ...JSON.parse(data.content),
          };
        }
        return {...(data.content ?? {}), id: data.id};
      });
    } catch (err: any) {
      alertApi.post({ message: `Error getting additional information: ${err?.message}`, severity: 'error' });
      return [];
    }
  }, [group, alertApi]);


  const fillInformations = useCallback(async () => {
    if (hasFetched) {
      return;
    }

    try {
      const usr = await identityApi.getBackstageIdentity();
      const userEntity = await catalogApi.getEntityByRef(process.env.NODE_ENV === 'development' ? config.getOptionalString('localhost.userEntityRef') ?? 'user:default/user.guest' : usr.userEntityRef);
      if (userEntity) {
        setIdentity(userEntity);
        getAdditionalInformation(`group:${userEntity.metadata.namespace}/${userEntity.metadata.name}`).then((data) => {
          if (data) {
            setAdGroup(data);
          }
        });
      }
    } catch (err) {
      alertApi.post({ message: `Error getting user entity: ${err?.message}`, severity: 'error' });
    } finally {
      setLoading(false);
      setHasFetched(true);
    }
  }, [config, catalogApi, identityApi, alertApi, getAdditionalInformation, hasFetched]);

  useEffect(() => {
    if (identity && adGroup) {
      return;
    }
    fillInformations();
  }, [fillInformations, identity, adGroup]);

  const extractIdentityValue = useCallback((template: string, throwException: boolean = false, extraContext?: object) => {
    try {
      const cfg: { [k: string]: any } = {};
      if (template?.includes("config") && template?.includes("{{")) {
        const configKey = template.split("config.")[1].split("}}")[0].trim();
        for (const k of configKey.split(".")) {
          cfg[k] = config.getOptional(k);
        }
      }
      if (!identity) {
        return template;
      }
      const renderedString = njucks.renderString(template, { identity, env: process.env, flags, location: window.location.href, config: cfg, leadGroup: adGroup, ...(extraContext ?? {}) });
      return renderedString;
    } catch (err: any) {
      if (!throwException) {
        alertApi.post({ message: `Error rendering template: ${template}. ${err.message}`, severity: 'error' });
        return template;
      }
      throw err;
    }
  }, [identity, alertApi, config, adGroup, flags]);

  const processItem = useCallback((item: any): any => {
    if (typeof item === 'string') {
      return extractIdentityValue(item);
    } else if (Array.isArray(item)) {
      return item.map(subItem => processItem(subItem));
    } else if (typeof item === 'object' && item !== null) {
      return Object.keys(item).reduce((acc, key) => {
        acc[key] = processItem(item[key]);
        return acc;
      }, {} as Record<string, any>);
    }
    return item;
  }, [extractIdentityValue]);

  return (
    <TemplateContext.Provider value={{ extractIdentityValue, loading, processItem, identity, adGroup }}>
      {children}
    </TemplateContext.Provider>
  );
};
