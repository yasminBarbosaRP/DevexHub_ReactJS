import { Entity } from "@backstage/catalog-model";

export const ADDITIONAL_INFORMATION_TABLE = 'additional_information';
export const MICROSOFT_AD_TABLE = 'microsoft_ad';
export const MEMBERS_TABLE = 'members';
export const EVENTS_TABLE = 'events';

export type AdditionalInformation = {
  id: string;
  entityRef: string;
  orphan: boolean;
  content?: Entity;
};

export type MicrosoftAD = {
  id: string;
  content?: any;
  userLastFetchedAt?: Date;
  groupLastFetchedAt?: Date;
};

export type Members = {
  entityRef: string;
  additionalInformationId: string;
}