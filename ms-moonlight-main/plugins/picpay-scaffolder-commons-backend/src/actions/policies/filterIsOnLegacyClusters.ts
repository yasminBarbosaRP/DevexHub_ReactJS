import got from 'got';
import { RepositoryDetails } from '../../interfaces/githubRepository';
import HarnessRepository from '../../repositories/harness';

export const makeHttpClient = (apiKey: string) => {
  return got.extend({
    responseType: 'json',
    headers: {
      'x-api-key': apiKey,
    },
  });
};

export const isThereInLegacyClusters = async (
  components: any,
  repositoryDetails: RepositoryDetails,
) => {
  const { logger } = components;
  const MSQA = 'k8s-qa';
  const MSPROD = 'k8s-prod';
  const HARNESS_API_KEY = process.env.HARNESS_API_KEY || 'not-found';

  if (HARNESS_API_KEY === 'not-found') {
    logger.info(
      JSON.stringify({ message: 'The HARNESS_API_KEY is not-found' }),
    );
  }

  const httpClient = makeHttpClient(HARNESS_API_KEY);
  const harnessAPI = new HarnessRepository(httpClient);
  const environments = await harnessAPI.getEnvironmentIdsBy(
    repositoryDetails.repository,
  );
  logger.info(JSON.stringify(environments));

  const environmentDefinition: any = {};
  for (const environment of environments) {
    const detail = await harnessAPI.getEnvironmentDetailsBy(environment.id);
    environmentDefinition[environment.name] = detail;
  }
  logger.info(JSON.stringify(environmentDefinition));

  for (const definitions of Object.keys(environmentDefinition)) {
    for (const definition of environmentDefinition[definitions]) {
      if (![MSQA, MSPROD].includes(definition.name)) {
        logger.error(JSON.stringify({ clusterName: definition.name }));
        throw new Error(
          `There is a new cluster ${definition.name} configured, not only msqa/msprod`,
        );
      }
    }
  }
};
