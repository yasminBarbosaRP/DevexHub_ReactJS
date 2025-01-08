import { FullAdditionalInformation, Members } from "@internal/plugin-picpay-entity-provider-backend";

export type Info = {
  user_id: string;
  personal_email: string;
  username: string;
  sso_email: string;
  joined_at: string;
  removed_at: string;
  is_on_org: boolean;
  groups: string[];
};

export type InfoApi = {
  getInfo(): Promise<Info>;
  getMembers(id: string): Promise<Members[]>;
  getFullAdditionalInformation(entityRef: string): Promise<FullAdditionalInformation[]>;
};
