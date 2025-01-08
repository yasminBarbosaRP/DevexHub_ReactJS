import { Got, HTTPError } from 'got';
import { Logger } from 'winston';
import { DeployType } from './DeployType';
import DeployApplication from '../interfaces/DeployApplication';
import { JsonObject } from '@backstage/types';

const BASE_URL = process.env.ARGOCD_ENDPOINT;
const API_VERSION = 'api/v1';
const USERNAME = process.env.ARGOCD_USERNAME;
const PASSWORD = process.env.ARGOCD_PASSWORD;

export class Argocd implements DeployApplication {
  private baseUrl: string;
  private _token: string = '';

  constructor(
    private readonly applicationName: string,
    private readonly logger: Logger,
    private readonly clientGot: Got,
  ) {
    this.baseUrl = `${BASE_URL}/${API_VERSION}`;
  }

  public async auth(): Promise<void> {
    try {
      const data: { token: string } = await this.clientGot
        .post(`${this.baseUrl}/session`, {
          json: {
            password: PASSWORD,
            username: USERNAME,
          },
        })
        .json();

      this._token = data.token;
    } catch (e) {
      if (e instanceof HTTPError && e.response.statusCode >= 400) {
        this.logger.info(`Error ArgoCD auth.`);
      }
      throw e;
    }
  }

  public async hasApplication(): Promise<string> {
    try {
      const data: JsonObject = await this.clientGot
        .get(`${this.baseUrl}/applications/${this.applicationName}-hom`, {
          headers: {
            Authorization: `Bearer ${this._token}`,
          },
        })
        .json();

      return !data.hasOwnProperty('error') ? DeployType.ARGOCD : '';
    } catch (e) {
      if (e instanceof HTTPError && e.response.statusCode === 404) {
        this.logger.info(
          `This application ${this.applicationName} does not exist on ArgoCd`,
        );
        return '';
      }
      throw e;
    }
  }
}
