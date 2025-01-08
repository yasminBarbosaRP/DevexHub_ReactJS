export interface Config {
  /**
  * Visible in frontend and backend
  * @visibility backend
  */
  localhost?: {
    /**
    * Visible in frontend and backend
    * @visibility backend
    */
    user: string;
    /**
    * Visible in frontend and backend
    * @visibility backend
    */
    userEntityRef: string;
  },
  source?: 's3' | 'microsoftAD';
  slack?: {
    tokens?: string;
  }
  s3?: {
    endpoint: string;
    region: string;
    accessKeyId: string;
    secretAccessKey: string;
    sessionToken: string;
    forcePathStyle: boolean;
  };
  microsoftAD?: {
    tenantId: string;
    clientId: string;
    clientSecret: string;
    authorityHost: string;
  }
}
