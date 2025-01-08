import {
  HandlingValuesFilesService,
  Strategy,
} from '@internal/plugin-picpay-scaffolder-copy-helm-agorcd-backend';
import YAML, { dump } from 'js-yaml';

type Options = {
  pathTemporaryServiceName: string;
  strategy: Strategy;
  nodeAffinity: string;
  externalSecretsMountPath?: string;
  bu: string;
  environment: string;
  segregateChartsByEnvironment: boolean;
};

const V1_PREFIX = 'picpay-ms';
const V2_PREFIX = 'picpay-ms-v2';

export class HelmchartsMigrateCluster extends HandlingValuesFilesService {
  private file: string = '';
  private content: any;
  private nodeAffinity: string;
  private externalSecretsMountPath?: string;
  private bu: string;
  private environment: string;
  private shouldSegregateByEnvironment: boolean;

  constructor(options: Options) {
    super(options.pathTemporaryServiceName, options.strategy);
    this.nodeAffinity = options.nodeAffinity;
    this.externalSecretsMountPath = options.externalSecretsMountPath;
    this.bu = options.bu;
    this.environment = options.environment;
    this.shouldSegregateByEnvironment = options.segregateChartsByEnvironment;
  }

  public runEdit() {
    this.file = this.strategy.getFileName();
    const contentFile: string = this.loadValuesFile(this.file);
    this.content = YAML.load(contentFile);

    if (this.content.hasOwnProperty(V1_PREFIX)) {
      this.editFileMigrationClusterV1();
    } else if (this.content.hasOwnProperty(V2_PREFIX)) {
      this.editFileMigrationClusterV2();
    }
  }

  private chanceContent(content: any, callback: Function) {
    const nodeKeys = ['workers', 'apis', 'cronjobs'];

    nodeKeys.forEach(index => callback(index));
    this.saveNewContent(this.file, dump(content));
  }

  private editFileMigrationClusterV2() {
    const content = this.content;

    const externalSecrets = (): any => ({
      enabled: true,
      type: 'vault',
      mountPath: `${this.externalSecretsMountPath}`,
      path: `kv/${this.bu}/${this.environment === 'prod' ? 'prd' : 'hom'}`,
    });

    let chartVersion = V2_PREFIX;

    if (
      this.shouldSegregateByEnvironment &&
      this.strategy.getEnvironment() === 'qa'
    ) {
      chartVersion = `${V2_PREFIX}-qa`;
      if (content[V2_PREFIX]) {
        content[chartVersion] = { ...content[V2_PREFIX] };
        this.deleteContent(content, [V2_PREFIX]);
      }
    }

    content.global.externalSecrets = externalSecrets();

    const changeContent = (keyName: string): any => {
      if (
        !content[chartVersion] ||
        !content[chartVersion][keyName] ||
        content[chartVersion][keyName].length <= 0
      ) {
        return;
      }

      const contentValue = content[chartVersion][keyName];
      delete content[chartVersion][keyName];

      contentValue.forEach((_: any, index: number) => {
        this.handlerEnvFrom(contentValue[index]);
        this.handlerReadinessLiveness(contentValue[index]);

        if (contentValue[index].hpa.metrics) {
          delete contentValue[index].hpa.metrics;
        }

        this.handlerIngress(contentValue[index]);

        contentValue[index].workload = this.nodeAffinity;

        if (contentValue[index].sidecar) {
          delete contentValue[index].sidecar.servicePort;
          this.handlerReadinessLiveness(contentValue[index]);
        }

        this.deleteContent(contentValue[index], [
          'sa',
          'affinity',
          'tolerations',
        ]);
        this.deleteContentThatContains(
          contentValue[index].annotations,
          'vault',
        );
        if (
          contentValue[index].annotations &&
          Object.keys(contentValue[index].annotations).length === 0
        ) {
          this.deleteContent(contentValue[index], ['annotations']);
        }
      });

      content[chartVersion] = { [keyName]: changeContent };
    };

    this.chanceContent(content, changeContent);
  }

  private editFileMigrationClusterV1() {
    const content = this.content;
    const externalSecrets = (): any => ({
      enabled: true,
      secretStore: 'cluster-secret-store-default',
    });

    content.global.externalSecrets = externalSecrets();
    let chartVersion = V1_PREFIX;

    if (
      this.shouldSegregateByEnvironment &&
      this.strategy.getEnvironment() === 'qa'
    ) {
      chartVersion = `${V1_PREFIX}-qa`;
      if (content[V1_PREFIX]) {
        content[chartVersion] = { ...content[V1_PREFIX] };
        this.deleteContent(content, [V1_PREFIX]);
      }
    }

    const changeContent = (keyName: string): any => {
      if (
        !content[chartVersion] ||
        !content[chartVersion][keyName] ||
        content[chartVersion][keyName].length <= 0
      ) {
        return;
      }

      const contentValue = content[chartVersion][keyName];
      delete content[chartVersion][keyName];

      contentValue.forEach((_: any, index: number) => {
        this.handlerIngress(contentValue[index]);
        contentValue[index].workload = this.nodeAffinity;
        this.deleteContent(contentValue[index], ['affinity']);
        this.deleteContentThatContains(
          contentValue[index].annotations,
          'vault',
        );
        if (
          contentValue[index].annotations &&
          Object.keys(contentValue[index].annotations).length === 0
        ) {
          this.deleteContent(contentValue[index], ['annotations']);
        }
      });

      content[chartVersion][keyName] = changeContent;
    };

    this.chanceContent(content, changeContent);
  }

  private handlerIngress(content: any): void {
    if (content.ingress) {
      const ingressApis = content.ingress;
      const hostsIngressApis = ingressApis[0].hosts;
      delete content.ingress[0].hosts;

      const hostsApis: Set<string> = new Set();
      for (const [_, value] of Object.entries(hostsIngressApis)) {
        // @ts-ignore
        hostsApis.add(value.hostname);
        // @ts-ignore
        if (!value.hostname.startsWith('migration-'))
          // @ts-ignore
          hostsApis.add(`migration-${value.hostname}`);
      }

      content.ingress[0].hosts = Array.from(hostsApis).map(host => ({
        hostname: host,
      }));
      content.ingress[0].enabled = true;
      content.ingress[0].path = '/';
    }
  }

  private handlerEnvFrom(content: any): void {
    const secretRefKey = {
      secretRef: {
        name: 'envs',
      },
    };

    if (content.envFrom) {
      const validateSecretRef: any = content.envFrom
        .map(
          (elements: any) =>
            elements.secretRef &&
            elements.secretRef.name &&
            elements.secretRef.name === 'envs',
        )
        .filter((value: any) => value !== undefined);

      if (!validateSecretRef[0]) {
        content.envFrom.forEach((keys: Array<object>, index: number) => {
          if (keys.hasOwnProperty('secretRef')) {
            content.envFrom[index] = secretRefKey;
          }
        });
      }
      return;
    }

    content.envFrom = [secretRefKey];
  }

  private handlerReadinessLiveness(content: any): void {
    const newContentReadinessLiveness = (event: any = ''): any => {
      const defaultContent = {
        initialDelaySeconds: 25,
        periodSeconds: 10,
        successThreshold: 1,
        failureThreshold: 3,
        timeoutSeconds: 3,
      };

      if (event && event.enabled) {
        delete event.enabled;
      }

      return Object.assign(defaultContent, content);
    };

    for (const key of ['readiness', 'liveness']) {
      if (content[key]) {
        const contentReadLive = newContentReadinessLiveness(content[key]);
        delete content[key];
        content[key] = contentReadLive;
      }
    }
  }

  private deleteContent(content: any, keys: string[]): void {
    for (const key of keys) {
      if (!content[key]) {
        continue;
      }

      delete content[key];
    }
  }

  private deleteContentThatContains(
    content: { [key: string]: any },
    value: string,
  ): void {
    if (!content) return;

    for (const key of Object.keys(content)) {
      if (key.includes(value)) {
        delete content[key];
      }
    }
  }
}
