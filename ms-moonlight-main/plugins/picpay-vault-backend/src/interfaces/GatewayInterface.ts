import { JsonObject } from '@backstage/types';

export default interface GatewayInterface {
  authAppRole(url: string, body: JsonObject): Promise<any>;
  createSecret(url: string, token: JsonObject, body: JsonObject): Promise<any>;
  createPath(url: string, token: JsonObject, body: JsonObject): Promise<any>;
  hasSecretEngine(url: string, token: JsonObject): Promise<any>;
}
