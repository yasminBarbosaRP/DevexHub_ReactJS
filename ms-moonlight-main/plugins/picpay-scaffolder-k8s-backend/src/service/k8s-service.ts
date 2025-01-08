import {
  HttpError,
  KubeConfig,
  KubernetesObjectApi,
  V1Job,
  V1Namespace,
  V1Pod,
  V1Secret,
} from '@kubernetes/client-node';
import { Logger } from 'winston';
import fs from 'fs';

type EnvFormat = {
  name: string;
  value: any;
};

const decode = (str: string): string =>
  Buffer.from(str, 'base64').toString('binary');

export async function getPodCountByPhase(
  namespace: string,
  stage: string,
  ignorePhase: string = 'Running',
): Promise<number> {
  const client = getClient(stage);
  const pods = await client.list('v1', 'Pod', namespace);
  let count = 0;
  for (const pod of pods.body.items) {
    if (
      !(pod as V1Pod).status?.phase ||
      (pod as V1Pod).status?.phase === ignorePhase
    ) {
      count++;
    }
  }
  return Promise.resolve(count);
}

export async function listNamespaces(stage: string): Promise<string[]> {
  const client = getClient(stage);
  const namespaces = await client.list('v1', 'Namespace');
  const result: string[] = [];
  for (const n of namespaces.body.items) {
    const namespaceName = (n as V1Namespace).metadata?.name;
    console.info(JSON.stringify(n));
    if (!namespaceName)
      throw new Error('some error ocurred, metadata.namespace is empty');
    result.push(namespaceName);
  }
  return Promise.resolve(result);
}

export async function getSecrets(
  serviceName: string,
  stage: string,
): Promise<{ [key: string]: string }> {
  const client = getClient(stage);
  const result: { [key: string]: string } = {};
  const secrets = await client.list(
    'v1',
    'Secret',
    serviceName.startsWith('ms-') ? serviceName : `ms-${serviceName}`,
  );
  for (const secret of secrets.body.items) {
    const envs = (secret as V1Secret).data || {};
    for (const key of Object.keys(envs)) {
      result[key] = decode(envs[key]);
    }
  }
  return Promise.resolve(result);
}

export async function createNamespace(
  logger: Logger,
  serviceName: string,
  stage: string,
) {
  const kc = getConfig(stage);
  const client = KubernetesObjectApi.makeApiClient(kc);
  const namespaceObject = new V1Namespace();
  namespaceObject.kind = 'Namespace';
  namespaceObject.apiVersion = 'v1';
  namespaceObject.metadata = {
    name: `ms-${serviceName}`,
    labels: {
      name: `ms-${serviceName}`,
      project: serviceName,
    },
  };
  try {
    await client.create(namespaceObject);
  } catch (e: any) {
    if (e instanceof HttpError && e.body.reason === 'AlreadyExists') {
      logger.info(`Namespace ${serviceName} já existe em ${stage}, pulando!`);
      return;
    }
    throw e;
  }
}

export async function cleanUpCompletedJobs(logger: Logger, stage: string) {
  try {
    const kc = getConfig(stage || getCurrentStage());
    const client = KubernetesObjectApi.makeApiClient(kc);
    const jobs = await client.list('batch/v1', 'Job', getCurrentNamespace());
    const pods = await client.list('v1', 'Pod', getCurrentNamespace());

    logger.info('Cleaning previous jobs');
    jobs.body.items.forEach((job: any) => {
      if (job.status.succeeded >= 1) {
        const jobObject: V1Job = {
          ...job,
        };

        jobObject.kind = 'Job';
        jobObject.apiVersion = 'batch/v1';

        logger.debug(`deleting job ${JSON.stringify(jobObject)}`);
        if (!jobObject.kind) {
          logger.debug(
            `skipping deletion of job ${jobObject.metadata?.name} due empty kind`,
          );
          return;
        }

        void client.delete(jobObject);
      }
    });

    logger.info(
      'Cleaning previous pods from jobs that were successfuly created',
    );
    pods.body.items.forEach((pod: any) => {
      if (pod.metadata.labels['job-name'] && pod.status.phase === 'Succeeded') {
        const podObject: V1Pod = {
          ...pod,
        };

        podObject.kind = 'Pod';
        podObject.apiVersion = 'v1';

        logger.debug(`deleting pod ${JSON.stringify(podObject)}`);
        if (!podObject.kind) {
          logger.debug(
            `skipping deletion of pod ${podObject.metadata?.name} due empty kind`,
          );
          return;
        }

        void client.delete(podObject);
      }
    });

    logger.info('All previous jobs were successfully cleaned');
  } catch (e: any) {
    logger.info('Failed to clear jobs', JSON.stringify(e), e);
  }
}

export async function createjob(
  logger: Logger,
  serviceName: string,
  image: string,
  envs: Array<EnvFormat> = [],
  stage: string = '',
) {
  const kc = getConfig(stage || getCurrentStage());
  const client = KubernetesObjectApi.makeApiClient(kc);

  const jobObject: V1Job = {
    kind: 'Job',
    metadata: {
      name: `job-${serviceName}`,
      annotations: {
        app: 'job',
      },
      namespace: getCurrentNamespace(),
    },
    apiVersion: 'batch/v1',
    spec: {
      backoffLimit: 4,
      template: {
        spec: {
          restartPolicy: 'Never',
          containers: [
            {
              name: `job-${serviceName}`,
              image: image,
              envFrom: [{ secretRef: { name: 'envs' } }],
              env: envs,
            },
          ],
        },
      },
    },
  };

  try {
    logger.info(`Creating k8s object that will generate observability app`);
    logger.debug(`K8S Object=${JSON.stringify(jobObject)}`);
    await Promise.all([
      cleanUpCompletedJobs(logger, stage),
      client.create(jobObject),
    ]);
  } catch (e: any) {
    if (e instanceof HttpError && e.body.reason === 'AlreadyExists') {
      logger.info(`Job ${serviceName} already exists.`);
      return;
    }
    if (e instanceof HttpError) {
      logger.info(
        `Failed to generate app on k8s: ${JSON.stringify(e.body)} ${
          e.body.reason
        }`,
      );
      throw e;
    }
    throw e;
  }
}

function getClient(stage: string): KubernetesObjectApi {
  const kc = getConfig(stage);
  return KubernetesObjectApi.makeApiClient(kc);
}

function getCurrentStage(): string {
  if (process.env.NODE_ENV === 'production') {
    return 'msprod';
  }
  return 'msqa';
}

function getCurrentNamespace(): string {
  return fs
    .readFileSync('/var/run/secrets/kubernetes.io/serviceaccount/namespace')
    .toString();
}

function getConfig(stage: string): KubeConfig {
  const config = getEnvs(stage);
  const kc = new KubeConfig();
  kc.loadFromClusterAndUser(
    {
      server: config.url,
      skipTLSVerify: true,
      name: stage,
    },
    {
      name: 'moonlight',
      token: config.token,
    },
  );
  return kc;
}

function getEnvs(stage: string): { url: string; token: string } {
  let result: { url: string; token: string };
  switch (stage) {
    case 'msqa':
      result = {
        url: process.env.KUBERNETES_URL_QA || '',
        token: process.env.KUBERNETES_TOKEN_QA || '',
      };
      break;
    case 'msprod':
      result = {
        url: process.env.KUBERNETES_URL_PROD || '',
        token: process.env.KUBERNETES_TOKEN_PROD || '',
      };
      break;
    default:
      throw new Error(`Não existe configuração para o ambiente ${stage}`);
  }
  if (result.url === '' || result.token === '') {
    throw new Error(
      `Não foi possível carregar a configuração para o ambiente ${stage}`,
    );
  }
  return result;
}
