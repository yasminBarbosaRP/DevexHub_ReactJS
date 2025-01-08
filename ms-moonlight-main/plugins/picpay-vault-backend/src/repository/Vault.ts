import { JsonObject } from '@backstage/types';
import GatewayInterface from '../interfaces/GatewayInterface';
import { VaultOptions } from '../models/VaultOptions';
import { VaultEnums } from '../models/VaultEnums';
import { Status } from '../models';

export class Vault {
  private readonly gateway: GatewayInterface;
  private readonly url?: string;
  private readonly engine: string;
  private readonly microserviceName?: string;
  private readonly token: JsonObject;
  private readonly extraPath?: string = '';
  private readonly separateSecrets: boolean = false;
  private _environment: string = '';

  constructor(options: VaultOptions) {
    this.url = options.vault.url;
    this.gateway = options.gateway;
    this.engine = options.engine;
    this.microserviceName = options.microserviceName;
    this.token = options.token;
    this.extraPath = options.extraPath;
    this.separateSecrets = options.separateSecrets ?? false;
  }

  public set environment(environment: string) {
    this._environment = environment;
  }

  public get environment() {
    return this._environment;
  }

  public get pathKvEngine(): string {
    let initialVaultEngine = 'kv/';
    let subPath = '';

    if (this.separateSecrets) {
      initialVaultEngine = '';
      subPath = '/env';
    }

    if (this.extraPath !== VaultEnums.VAULT_EXTRA_PATH && this.extraPath !== undefined) {
      return `${initialVaultEngine}${this.extraPath}/${this.engine}/${this.environment}${subPath}`;
    }

    return `${initialVaultEngine}${this.engine}/${this.environment}${subPath}`;
  }

  public async treatmentCreateSecretKvEngine(
    envs: { name: string; value?: string }[],
  ): Promise<JsonObject> {
    const payload = await envs.reduce((acc: any, curr) => {
      acc[curr.name.toUpperCase().replace(/-/g, '_')] = curr.value ?? '';
      return acc;
    }, {});

    return await this.createSecret(payload);
  }

  public async createGlobal() {
    const body = {
      data: {},
      options: {
        cas: 0,
      },
    };

    const url = `${this.url}/global/env/${this.environment}/data/${this.microserviceName}`; // path = hom ou prd/data/ms-moonlight

    return this.gateway.createPath(url, this.token, body);
  }

  public async hasSecretEngine(): Promise<boolean> {
    const url = `${this.url}/sys/mounts/${this.pathKvEngine}`;
    const hasScretEngine: JsonObject = await this.gateway.hasSecretEngine(
      url,
      this.token,
    );
    return (
      Object.keys(hasScretEngine)[0].toLocaleUpperCase() !==
      Status.NO_SECRET_ENGINE_MOUNT_KEY
    );
  }

  private async createSecret(payload: JsonObject): Promise<JsonObject> {
    const path: string = `/${this.pathKvEngine}/data/${this.microserviceName}`;
    const url: string = `${this.url}${path}`;
    const body: JsonObject = {
      data: payload,
      options: {
        cas: 0,
      },
    };

    return await this.gateway.createSecret(url, this.token, body);
  }
}
