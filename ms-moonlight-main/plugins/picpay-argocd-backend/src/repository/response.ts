export type SessionBody = {
  username: string;
  password: string;
};
export type SessionResponse = {
  token: string;
};

export type ApplicationResponse = {
  metadata: {
    annotations: {};
    clusterName: string;
  };
  spec: {
    destination: {
      name: string;
      namespace: string;
    };
  };
};

export type ClustersResponse = {
  metadata: {};
  items: {
    server: string;
    name: string;
    config: {
      tlsClientConfig: {
        insecure: boolean;
        caData: string;
      };
    };
    connectionState: {
      status: string;
      message: string;
      attemptedAt: string;
    };
    serverVersion: string;
    info: {
      connectionState: {
        status: string;
        message: string;
        attemptedAt: string;
      };
      serverVersion: string;
      cacheInfo: {
        resourcesCount: number;
        apisCount: number;
        lastCacheSyncTime: string;
      };
      applicationsCount: number;
      apiVersions: string[];
    };
    labels: {
      bu: string;
    };
    annotations: {
      'kubectl.kubernetes.io/last-applied-configuration': string;
    };
  }[];
};

export type ClusterLabel = {
  apiVersion: string;
  kind: string;
  metadata: {
    annotations: {};
    labels: {
      [key: string]: string;
    };
    name: string;
    namespace: string;
  };
  stringData: {
    config: string;
    name: string;
    server: string;
  };
  type: string;
};
