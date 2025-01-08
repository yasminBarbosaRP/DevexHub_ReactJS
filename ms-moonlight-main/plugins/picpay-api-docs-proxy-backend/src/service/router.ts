import { errorHandler } from '@backstage/backend-common';
import express from 'express';
import Router from 'express-promise-router';
import { Logger } from 'winston';
import { getIdentityFromToken } from '@internal/plugin-picpay-core-components';
import { Config } from '@backstage/config';
import { DatabaseApiProxy } from '../database/ApiProxyRepository';
import multer from 'multer';
import axios, { AxiosError } from 'axios';

export interface RouterOptions {
  logger: Logger;
  config: Config;
  database: DatabaseApiProxy;
}

export async function createRouter(
  options: RouterOptions
): Promise<express.Router> {
  const router = Router();

  const repository = options.database.apiProxyRepository();

  const allowedHosts =
    options.config
      .getOptionalConfigArray('backend.reading.allow')
      ?.map(allowConfig => {
        const host = allowConfig.getOptionalString('host');
        if (!host) {
          return '';
        }

        return host.split(':')?.[0] ?? ``;
      })
      .filter(host => !!host) ?? [];

  const hostPredicates =
    allowedHosts.map(hostname => {
      if (hostname.startsWith('*.')) {
        return (url: URL) => url.hostname.endsWith(hostname.slice(1));
      }

      return (url: URL) => url.hostname === hostname;
    }) ?? [];

  const checkHost = (url: URL) => {
    if (hostPredicates.length === 0) return true;
    return hostPredicates.some(p => p(url));
  };

  const storage = multer.memoryStorage();
  const upload = multer({ storage: storage });

  router.use(express.json());
  router.use(express.urlencoded({ extended: true }));
  router.use(upload.single('file'));

  router.get('/', async (request, response) => {
    const user = await getIdentityFromToken({
      config: options.config,
      request,
    });

    if (!user || !user.userEntityRef) {
      response.status(400).send('User not found');
      return;
    }

    const results = await repository.findByUser(
      user?.userEntityRef as string,
      parseInt((request?.query?.page as string) ?? '1', 10)
    );

    if (request.query.explicit === 'true') {
      response.status(200).send(results);
      return;
    }

    response.status(200).send(
      results.map(({ id, date, request: req, response_status_code }) => ({
        id,
        date,
        response_status_code,
        request: {
          url: req.url,
          method: req.method,
        },
      }))
    );
    return;
  });

  router.post('/', async (request, response) => {
    const user = await getIdentityFromToken({
      config: options.config,
      request,
    });

    let bodyContent: string;

    if (
      typeof request.body.body === 'string' ||
      request.body.body instanceof String
    ) {
      bodyContent = request.body.body;
    } else {
      bodyContent = JSON.stringify(request.body.body);
    }

    const headers = {
      'x-moonlight-identity': user?.userEntityRef,
    };

    let fetchOptions: { [k: string]: any } = {};
    if (
      request.body.headers?.['content-type']?.includes('application/json') ||
      request.body.headers?.['Content-Type']?.includes('application/json')
    ) {
      fetchOptions = {
        method: request.body.method,
        headers: {
          ...headers,
          ...(request.body.headers || {}),
        },
        body: request.body.method.toLowerCase() !== 'get' ? bodyContent : null,
      };
    } else {
      fetchOptions = {
        method: request.body.method,
        headers: {
          ...headers,
          ...(typeof request.body.headers === 'string'
            ? JSON.parse(request.body.headers)
            : request.body.headers || {}),
        },
      };

      if (request.body.method.toLowerCase() !== 'get') {
        const newBody = new FormData();

        Object.entries(request.body).forEach(([key, value]) => {
          if (['url', 'method', 'headers'].includes(key)) return;
          newBody.append(key, value as string);
        });

        if (request.file)
          newBody.set(
            'file',
            new Blob([request.file.buffer], { type: request.file.mimetype }),
            request.file.originalname
          );

        fetchOptions.body = newBody;
      }
    }

    try {
      if (!user) {
        response.status(400).send('User not found');
        return;
      }

      if (!checkHost(new URL(request.body.url))) {
        throw new Error(
          `Invalid domain, allowed domains are: ${allowedHosts.join(', ')}`
        );
      }

      const res = await axios.request({
        headers: fetchOptions.headers,
        method: fetchOptions.method,
        url: request.body.url,
        data: fetchOptions.body,
      });

      Object.entries(res.headers).forEach(([k, v]) => {
        response.set(k, v);
      });

      repository.create({
        identity: user,
        request: {
          url: request.body.url,
          headers: fetchOptions.headers,
          body: fetchOptions.body,
          method: fetchOptions.method,
        },
        date: new Date(),
        response_status_code: res.status,
      });

      response.status(res.status);

      response.send(res.data);
      options.logger.debug(`Request to ${request.body.url} was successful`);
    } catch (err: any) {
      let statusCode = 0;
      let errorMessage: any = '';

      if (axios.isAxiosError(err)) {
        const axiosError: AxiosError = err as AxiosError;
        statusCode = axiosError.response?.status || 0;
        errorMessage = axiosError.response?.data || axiosError.message;
      }

      repository.create({
        identity: user,
        request: {
          url: request.body.url,
          headers: fetchOptions.headers,
          body: fetchOptions.body,
          method: fetchOptions.method,
        },
        date: new Date(),
        response_status_code: statusCode,
      });

      options.logger.error('error sending request', {
        message: err?.message,
        stack: err?.stack,
      });

      if (statusCode !== 0) {
        response.status(statusCode).send(errorMessage);
        return;
      }

      response.status(500).send({
        message: 'Error sending request, possibly Moonlight failed to deliver',
        detail: {
          message: err.message,
          stack: err.stack,
        },
      });
    }
  });
  router.use(errorHandler());
  return router;
}
