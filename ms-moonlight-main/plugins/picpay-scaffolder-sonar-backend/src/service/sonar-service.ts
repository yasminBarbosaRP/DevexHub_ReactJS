import { GithubHelper } from '../service/github-service';
import got, { HTTPError } from 'got';
import { Logger } from 'winston';

const baseUrl = process.env.SONARQUBE_BASE_URL;
const org = process.env.SONARQUBE_ORGANIZATION;
const token = Buffer.from(`${process.env.SONARQUBE_TOKEN}:`).toString('base64');

export class SonarHelper {
  constructor(
    private logger: Logger,
    private gitHelper: GithubHelper,
  ) {}

  async createProject(name: string) {
    try {
      await got.post(`${baseUrl}/projects/create`, {
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `organization=${org}&name=${name}&project=PicPay_${name}`,
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (
          e.response.statusCode === 400 &&
          e.response.rawBody.includes('already exists')
        ) {
          this.logger.info(`Project ${name} already exists, skipping step.`);
          return;
        }
      }
      throw e;
    }
  }
  async setQualityGateDefault(name: string) {
    try {
      await got.post(`${baseUrl}/qualitygates/select`, {
        headers: {
          Authorization: `Basic ${token}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `gateId=60366&organization=${org}&projectKey=PicPay_${name}`,
      });
    } catch (e) {
      if (e instanceof HTTPError) {
        if (
          e.response.statusCode === 400 &&
          e.response.rawBody.includes('Problem to set the Quality Gate Default')
        ) {
          this.logger.info(
            `Problem to set the Quality Gate Default on Project ${name}. ${e.response.rawBody}`,
          );
          return;
        }
      }
      throw e;
    }
  }

  async setOrganizationDefault(name: string) {
    try {
      const githubId: number = await this.gitHelper.getRepoId(name);

      await got.post(
        `${baseUrl}/alm_integration/provision_projects?installationKeys=PicPay/${name}|${githubId}&organization=${org}`,
        {
          headers: {
            Authorization: `Basic ${token}`,
          },
        },
      );
    } catch (e) {
      if (e instanceof HTTPError) {
        this.logger.info(
          `Problem to set the organization on Project ${name}. ${e.response.rawBody}`,
        );
        throw e;
      }
    }
  }

  async setOwnerProject(name: string, bu: string, squad: string) {
    try {
      await got.post(
        `${baseUrl}/project_tags/set?project=PicPay_${name}&organization=${org}&tags=bu-${bu}, squad-${squad}`,
        {
          headers: {
            Authorization: `Basic ${token}`,
          },
        },
      );
    } catch (e) {
      if (e instanceof HTTPError) {
        this.logger.info(
          `Problem to set owners on Project ${name}. ${e.response.rawBody}`,
        );
        throw e;
      }
    }
  }
}
