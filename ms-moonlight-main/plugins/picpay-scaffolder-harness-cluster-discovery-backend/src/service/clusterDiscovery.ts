import path from 'path';
import { GithubRepository } from '../repository/github';

const ORG = 'PicPay';
const HarnessBaseRepository = 'ops-harness-setup';

export class ClusterDiscovery {
  private readonly githubRepository: GithubRepository;

  constructor(githubRepository: GithubRepository) {
    this.githubRepository = githubRepository;
  }

  discover(clusters: any): any {
    const clusterIdentityByEnvironment: any = {};

    for (const environment of Object.keys(clusters)) {
      const environmentClusters = clusters[environment];

      if (environmentClusters.length === 0) {
        throw new Error(
          `There is no cluster configured for the ${environment} environment.`,
        );
      }

      if (environmentClusters.length === 1) {
        const clusterName = environmentClusters[0].name;
        const realClusterName = this.discoverCluster(clusterName);

        if (environment === 'qa') {
          clusterIdentityByEnvironment.hom = realClusterName;
        } else if (environment === 'prod') {
          clusterIdentityByEnvironment.prd = realClusterName;
        } else {
          throw new Error(
            "There isn't config with environment 'qa' or 'prod'.",
          );
        }
      } else {
        const filteredClusters = environmentClusters.filter(
          (cluster: any) =>
            !cluster.name.startsWith('k8s-prod') &&
            !cluster.name.startsWith('k8s-qa'),
        );

        if (environmentClusters.length >= 2) {
          const clusterName = filteredClusters[0].name;
          const realClusterName = this.discoverCluster(clusterName);

          if (environment === 'qa') {
            clusterIdentityByEnvironment.hom = realClusterName;
          } else if (environment === 'prod') {
            clusterIdentityByEnvironment.prd = realClusterName;
          } else {
            throw new Error(
              "There isn't config with environment 'qa' or 'prod'.",
            );
          }
        } else {
          throw new Error(
            `There are multiple clusters configured for the ${environment} environment, but none of them are valid.`,
          );
        }
      }
    }
    return clusterIdentityByEnvironment;
  }

  discoverCluster(clusterName: string): string {
    const clusterNameParsed = path.parse(clusterName);
    const re = /k8s-(\w+)-(qa|prod|hom|prd)/;
    const catcher = clusterNameParsed.name.match(re);

    switch (clusterNameParsed.name) {
      case 'k8s-qa':
        return 'picpay-ops-ms-00';
      case 'k8s-prod':
        return 'picpay-ops-msprod-00';
      default:
        if (catcher && catcher.length > 2) {
          const environ = catcher[2];
          const clusterRadicalName = catcher[1];

          if (['qa', 'hom'].includes(environ)) {
            return `eks-${clusterRadicalName}-use1-hom`;
          }
          if (['prd', 'prod'].includes(environ)) {
            return `eks-${clusterRadicalName}-use1-prd`;
          }
        }

        throw new Error('The cluster name was not found');
    }
  }

  async getClusterByEnvironment(
    microserviceName: string,
    environments: string[] = ['qa', 'prod'],
  ) {
    const clusters: any = {};

    for (const environment of environments) {
      let pathname = path.join(
        'Setup',
        'Applications',
        microserviceName,
        'Environments',
        environment,
        'Infrastructure Definitions',
      );
      let contents: any;

      try {
        contents = await this.githubRepository.getContents(
          ORG,
          HarnessBaseRepository,
          pathname,
        );
      } catch (error: any) {
        if (error.message === 'Not Found') {
          pathname = path.join(
            'disabled',
            microserviceName,
            'Environments',
            environment,
            'Infrastructure Definitions',
          );
          contents = await this.githubRepository.getContents(
            ORG,
            HarnessBaseRepository,
            pathname,
          );
        } else {
          throw error;
        }
      }

      if (Array.isArray(contents)) {
        clusters[environment] = contents;
      } else {
        clusters[environment] = [contents];
      }
    }

    return clusters;
  }
}
