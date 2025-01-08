export type Clusters = {
  name: string;
  bu: string;
};

export type AppCluster = {
  app: string;
  cluster: string;
  environment: string;
};

export interface ArgoCDRepository {
  GetApplicationClusters(app: string): Promise<AppCluster[]>;
  GetClusters(apps?: string[]): Promise<Clusters[]>;
}

export interface ArgoCDService {
  GetApplicationClusters(app: string): Promise<AppCluster[]>;
  GetClusters(): Promise<Clusters[]>;
  GetClusterFromBU(bu: string): Promise<Clusters[]>;
}
