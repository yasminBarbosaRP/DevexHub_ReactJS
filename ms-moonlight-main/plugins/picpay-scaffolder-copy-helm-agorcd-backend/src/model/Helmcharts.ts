import { ActionContext } from '@backstage/plugin-scaffolder-node';
import { UrlReader } from '@backstage/backend-common';
import { ScmIntegrations } from '@backstage/integration';

export type HelmchartsOptions = {
  reader: UrlReader;
  integrations: ScmIntegrations;
  context: ActionContext<{}>;
  repository: string;
  chartUrl?: string;
};
