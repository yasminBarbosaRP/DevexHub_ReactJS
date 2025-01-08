import { JsonObject } from '@backstage/types';
import HttpClient from '../interfaces/HttpClient';

export class VaultGateway {
  constructor(private readonly httpClient: HttpClient) {}

  async authAppRole(url: string, body: any) {
    return this.httpClient.post(url, body);
  }

  async createSecret(url: string, token: JsonObject, body: any) {
    return this.httpClient.post(url, body, token);
  }

  async createPath(url: string, token: JsonObject, body: JsonObject) {
    return this.httpClient.post(url, body, token);
  }

  async hasSecretEngine(url: string, token: JsonObject) {
    return this.httpClient.get(url, token);
  }
}
