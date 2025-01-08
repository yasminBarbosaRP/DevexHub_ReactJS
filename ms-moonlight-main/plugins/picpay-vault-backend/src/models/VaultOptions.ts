import { JsonObject } from '@backstage/types';
import GatewayInterface from '../interfaces/GatewayInterface';
import { VaultConfig } from './VaultConfig';

export type VaultOptions = {
  gateway: GatewayInterface;
  vault: VaultConfig;
  extraPath?: string
  engine: string;
  token: JsonObject;
  microserviceName: string;
  separateSecrets?: boolean;
};
