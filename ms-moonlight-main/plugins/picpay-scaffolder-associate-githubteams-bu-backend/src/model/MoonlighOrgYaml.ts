import { JsonObject } from '@backstage/types';

export type MoonlightOrgYaml = JsonObject & {
  apiVersion: string;
  kind: string;
  metadata: Metadada;
  spec: Spec;
};

export type Metadada = {
  name: string;
  description: string;
};

export type Spec = {
  profile: Profile;
  type: string;
  parent: string;
  children: string[];
};

export type Profile = {
  displayName: string;
};
