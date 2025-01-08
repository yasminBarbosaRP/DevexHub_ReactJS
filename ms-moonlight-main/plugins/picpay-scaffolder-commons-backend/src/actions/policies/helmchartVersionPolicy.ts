import path from 'path';
import YAML from 'js-yaml';

const decode = (str: string): string =>
  Buffer.from(str, 'base64').toString('utf-8');

export const checkVersionIsAvailable = (
  currentVersion: string,
  baseVersion: string,
): boolean => {
  return parseFloat(currentVersion) >= parseFloat(baseVersion) ? true : false;
};

const parseContent = (content: string): any => {
  const parsedContent = YAML.load(decode(content));
  return parsedContent;
};

const normalizeRepositoryName = (repositoryName: string) => {
  return repositoryName.replace('picpay-dev-', '');
};

export const isHelmchartsVersionAvailable = async (
  components: any,
  repository: string,
): Promise<boolean> => {
  const { logger } = components;
  const COMPARATOR_SYMBOLS = /[<=>]+/;
  const OWNER = 'picpay';
  const DEPENDENCY_TOKEN = 'picpay-ms';
  const BASE_VERSION = '0.18.0';
  const BASE_REPOSITORY = 'helm-charts';

  const { githubService } = components;
  const pathname = path.join(
    'services',
    normalizeRepositoryName(repository),
    'Chart.yaml',
  );
  const content = await githubService.getFileContents(
    OWNER,
    BASE_REPOSITORY,
    pathname,
  );

  const chartContent = parseContent(content);
  const dependencies = chartContent.dependencies;

  const picpayBaseDependency = dependencies.find(
    (dependency: any) => dependency.name === DEPENDENCY_TOKEN,
  );

  if (picpayBaseDependency) {
    logger.info(`picpay-ms were found in ${pathname}.`);
    const currentVersion = picpayBaseDependency.version.replace(
      COMPARATOR_SYMBOLS,
      '',
    );
    return checkVersionIsAvailable(currentVersion, BASE_VERSION);
  }
  logger.info(`picpay-ms was not found in ${pathname}.`);

  return true;
};
