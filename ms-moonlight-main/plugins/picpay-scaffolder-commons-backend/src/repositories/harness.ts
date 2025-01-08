const filterByNameQuery = (serviceName: string) =>
  `{
        applicationByName(name: "${serviceName}") {
            environments(limit: 10, offset: 0) {
                nodes {
                    name
                    type
                    id
                }
            }
        }
    }`;

const filterByEnvironmentQuery = (environmentId: string) =>
  `{
        environment(environmentId: "${environmentId}") {
            infrastructureDefinitions(
                filters: {
                    deploymentType: {
                        operator: EQUALS
                        values: "KUBERNETES"
                    }
                },
                limit: 2,
                offset: 0
            ) {
                nodes {
                    name
                    id
                }
            }
        }
    }`;

// const HARNESS_ACCOUNT_ID = process.env.HARNESS_ACCOUNT_ID
const BASE_URL = `https://app.harness.io/gateway/api/graphql`;

export default class HarnessRepository {
  constructor(private readonly client: any) {}

  async getEnvironmentIdsBy(serviceName: string) {
    if (serviceName === '') {
      throw new Error("The service name shouldn't be empty.");
    }

    try {
      const FILTER_BY_NAME_QUERY = filterByNameQuery(serviceName);
      const { body } = await this.client.post(BASE_URL, {
        json: { query: FILTER_BY_NAME_QUERY },
      });
      const nodes = body.data.applicationByName.environments.nodes;
      return nodes.map((node: any) => ({ id: node.id, name: node.name }));
    } catch (e: any) {
      if (e.name === 'TypeError') {
        throw new Error(`The application ${serviceName} does not exists`);
      }
      console.error(e);
      throw e;
    }
  }

  async getEnvironmentDetailsBy(environmentId: string) {
    const FILTER_BY_ENVIRONMENT_QUERY = filterByEnvironmentQuery(environmentId);
    const { body } = await this.client.post(BASE_URL, {
      json: { query: FILTER_BY_ENVIRONMENT_QUERY },
    });

    return body.data.environment.infrastructureDefinitions.nodes;
  }
}
