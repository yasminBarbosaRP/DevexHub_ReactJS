import { BackstageUserIdentity } from '@backstage/core-plugin-api';

export const DB_API_PROXY_TABLE = 'requests';

export type RawDbApiProxyRow = {
  id: string;
  identity: BackstageUserIdentity;
  request: {
    url: string;
    method: string;
    headers: { [key: string]: any };
    body?: string | null;
  };
  date: Date | string;
  response_status_code?: number;
  updated_at?: Date | string;
};
