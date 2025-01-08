import { Logger } from 'winston';
import got from 'got';
import { createjob } from '@internal/plugin-picpay-scaffolder-k8s-backend';

const DEFAULT_PLATFORM = 'newrelic';
const DEFAULT_STRATEGY = 'apm';
const OPENTELEMETRY = 'opentelemetry';
export class ObservabilityHelper {
  constructor(private logger: Logger) {}

  async createApp(
    name: string,
    language: string,
    platform: string = DEFAULT_PLATFORM,
    strategy: string = DEFAULT_STRATEGY,
  ) {
    this.logger.info(
      `creating observability for name=${name}, language=${language}, platform=${platform}, strategy=${strategy}`,
    );
    if (platform !== DEFAULT_PLATFORM) return;
    if (strategy === OPENTELEMETRY) {
      await this.postCreate(name);
    } else {
      const image: string = process.env.OBSERVABILITY_BASE_IMAGE || '';

      if (image === '') {
        throw new Error('base image env not found');
      }

      await createjob(this.logger, name, image, [
        { name: 'APP_NAME', value: name },
        { name: 'NEW_RELIC_APP_NAME', value: name },
        { name: 'LANGUAGE', value: language },
      ]);
    }
  }

  async postCreate(name: string) {
    this.logger.info('creating opentelemetry app');
    const res = await got.post(`https://trace-api.newrelic.com/trace/v1`, {
      headers: {
        'Content-Type': 'application/json',
        'Api-Key': process.env.NEW_RELIC_LICENSE_KEY,
        'Data-Format': 'newrelic',
        'Data-Format-Version': '1',
      },
      body: `[
                {
                  "common": {
                    "attributes": {
                      "service.name": "${name}",
                      "host": "moonlight.limbo.work"
                    }
                  },
                  "spans": [
                    {
                      "trace.id": "123456",
                      "id": "ABC",
                      "attributes": {
                        "duration.ms": 12.53,
                        "name": "/home"
                      }
                    },
                    {
                      "trace.id": "123456",
                      "id": "DEF",
                      "attributes": {
                        "service.name": "${name}",
                        "host": "moonlight.limbo.work",
                        "duration.ms": 2.97,
                        "name": "/test",
                        "parent.id": "ABC"
                      }
                    }
                  ]
                }
              ]`,
    });

    this.logger.info('opentelemetry returned status: ', res.statusCode);
  }
}
