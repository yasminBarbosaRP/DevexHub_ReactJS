import { JsonObject } from '@backstage/types';

export type Chart = JsonObject & {
  apiVersion: string;
  name: string;
  description: string;
  type: string;
  version: string;
  appVersion: string;
  dependencies: Dependencies[];
};

export type Dependencies = {
  name: string;
  version: string;
  repository: string;
};
