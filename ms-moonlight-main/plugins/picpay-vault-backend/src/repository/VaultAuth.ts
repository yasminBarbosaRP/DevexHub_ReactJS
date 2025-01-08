import { JsonObject } from '@backstage/types';
import GatewayInterface from '../interfaces/GatewayInterface';
import { VaultConfig } from '../models/VaultConfig';

export class VaultAuth {
  private _token: string = '';
  private url: string;
  private roleId: string;
  private secretId: string;

  constructor(
    readonly gateway: GatewayInterface,
    readonly options: VaultConfig,
  ) {
    this.url = options.url;
    this.roleId = options.roleId;
    this.secretId = options.secretId;
  }

  public get token(): JsonObject {
    return {
      'X-Vault-Token': this._token,
    };
  }

  public async auth(): Promise<void> {
    const body = {
      role_id: this.roleId,
      secret_id: this.secretId,
    };

    const response = await this.gateway.authAppRole(
      `${this.url}/auth/approle/login`,
      body,
    );
    this._token = response?.auth.client_token;
  }
}
