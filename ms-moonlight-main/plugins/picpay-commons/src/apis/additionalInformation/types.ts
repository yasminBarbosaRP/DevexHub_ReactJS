export type AdditionalInformationApi = {
  getByEntityRef(entityRef: string): Promise<AdditionalInformation[]>; 
};

export type AdditionalInformation = {
  id: string;
  entityRef: string;
  orphan: boolean;
  content?: any;
};