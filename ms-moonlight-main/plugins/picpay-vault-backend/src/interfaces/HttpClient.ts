import { JsonObject } from '@backstage/types';

export default interface HttpClient {
  get(url: string, token: JsonObject): Promise<any>;
  post(url: string, body?: any, header?: any): Promise<any>;
}
