import { Got, HTTPError } from 'got';
import { Logger } from 'winston';
import { DeployType } from './DeployType';
import DeployApplication from '../interfaces/DeployApplication';
import { JsonObject } from '@backstage/types';

const BASE_URL = 'https://app.harness.io/gateway/api/graphql';
const HARNESS_API_KEY = process.env.HARNESS_API_KEY;

export class Harness implements DeployApplication {
  constructor(
    private applicationName: string,
    private logger: Logger,
    private readonly clientGot: Got,
  ) {}

  private query(): string {
    return `
            {   
                query: {
                    applicationByName(name: "${this.applicationName}") {
                        id, 
                        name
                    }
                }
            }
        `;
  }

  public async hasApplication(): Promise<string> {
    try {
      const data: JsonObject = await this.clientGot
        .post(`${BASE_URL}`, {
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': HARNESS_API_KEY,
          },
          json: {
            query: this.query(),
          },
        })
        .json();

      return !data.hasOwnProperty('error') ? DeployType.HARNESS : '';
    } catch (e) {
      if (e instanceof HTTPError && e.response.statusCode === 404) {
        this.logger.info(
          `This application ${this.applicationName} does not exist on the Harness`,
        );
        return '';
      }
      throw e;
    }
  }
}
