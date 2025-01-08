import {
  AppCluster,
  ArgoCDRepository,
  ArgoCDService,
  Clusters,
} from '../interfaces/argocd';

export class ArgoCDImpl implements ArgoCDService {
  repo: ArgoCDRepository;

  constructor(repo: ArgoCDRepository) {
    this.repo = repo;
  }
  async GetApplicationClusters(app: string): Promise<AppCluster[]> {
    return this.repo.GetApplicationClusters(app);
  }
  async GetClusters(): Promise<Clusters[]> {
    return this.repo.GetClusters();
  }
  async GetClusterFromBU(bu: string): Promise<Clusters[]> {
    const clusters = await this.GetClusters();

    const response: Clusters[] = clusters.filter(e => e.bu.startsWith(bu));
    return Promise.resolve(response);
  }
}
