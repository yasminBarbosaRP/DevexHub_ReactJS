import { errorHandler } from '@backstage/backend-common';
import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { getUserToken } from '@internal/plugin-picpay-core-components';
import fetch from 'cross-fetch';

export interface RouterOptions {
  config: Config;
  logger: Logger;
}

export async function createRouter(
  options: RouterOptions,
): Promise<express.Router> {
  const { config, logger } = options;

  logger.info('Initializing Houston backend');

  const router = Router();
  router.use(express.json());

  const cfg = config.getConfig('houston');
  const url = `${cfg.get('url')}/api/v2/flags/app/${cfg.get('appId')}`;

  router.get('/health', (_, response) => {
    response.send({ status: 'ok' });
  });

  router.get('/flags', (request, response) => {
    const run = async () => {
      const user = await getUserToken({ config, request });

      logger.info(`USER ===== ${user}`);

      const init: RequestInit = {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          app_version: '1.0.0',
          device_os: 'web',
          os_version: '1.0.0',
          'x-consumer-id': user.name,
          'x-track-events': 'false',
          'x-request-origin': cfg.get('appId'),
        },
      };

      try {
        const data = await (await fetch(url, init)).json();

        Object.keys(data).forEach(key => {
          try {
            data[key] = JSON.parse(data[key]?.value);
          } catch {
            data[key] = data[key]?.value;
          }
        });

        response.json(data);
      } catch (err) {
        logger.error(err);
        response.json({ error: true, message: err });
      }
    };

    void run();
  });

  router.use(errorHandler());
  return router;
}
