import { CustomErrorBase, InputError } from '@backstage/errors';
import { createTemplateAction } from '@backstage/plugin-scaffolder-node';
import axios, { AxiosError, Method } from 'axios';
import axiosRetry from 'axios-retry';

export type KeyValue = {
  [key: string]: string;
};

export type Environments = {
  where: string;
  key: string;
  envName: string;
};

class StatusCodeError extends CustomErrorBase { }
class ResponseError extends CustomErrorBase { }

const timeZone = 'America/Sao_Paulo';

const arrangeEnvironments = (
  environments: Environments[],
  body: KeyValue | string,
  headers: KeyValue,
): { headers: KeyValue; body: KeyValue | string } => {
  for (const env of environments) {
    const envValue = process.env[env.envName];
    if (!envValue)
      throw new InputError(`Environment ${env.envName} was not found`);
    if (env.where === 'body') {
      if (typeof body === 'string') throw new InputError("To set an environment on body, it must be an object");
      body[env.key] = envValue;
    } else if (env.where === 'header') {
      headers[env.key] = envValue;
    } else {
      throw new InputError(
        `Invalid "where" key was found on environments:"${env.where}". Only header and body are allowed.`,
      );
    }
  }
  return { headers, body };
};

const replaceAlias = (value: string): string => {
  const currentDate = new Date();
  return value
    .replaceAll('%TIMESTAMP%', currentDate.getTime().toString())
    .replaceAll('%DATETIME%', currentDate.toLocaleString('pt-BR', { timeZone }))
    .replaceAll(
      '%DATE%',
      currentDate.toLocaleDateString('pt-BR', { timeZone }),
    );
};

export const httpRequestAction = () => {
  return createTemplateAction<{
    url: string;
    method: Method;
    headers?: KeyValue;
    body?: KeyValue | string;
    environments?: Environments[];
    expectedStatusCode?: number[];
    printResultAfter?: boolean;
    retry?: boolean;
    retryCount?: number;
    retryDelaySeconds?: number;
    throwOutput?: boolean;
  }>({
    id: 'moonlight:http-request',
    supportsDryRun: true,
    schema: {
      input: {
        required: ['url', 'method'],
        properties: {
          url: {
            type: 'string',
            title: 'Url',
            description: 'The URL path to make the HTTP call',
          },
          expectedStatusCode: {
            type: 'array',
            title: 'Expected Status Codes',
            description:
              'List of expected success status code. If none is match, an error is thrown',
          },
          method: {
            type: 'string',
            title: 'Method',
            description: 'The Method of the Request: GET,PUT,POST or DELETE',
          },
          headers: {
            type: 'object',
            title: 'Headers',
            description: 'Headers of the Request',
          },
          environments: {
            type: 'array',
            title: 'Environments',
            description:
              'Get an environment variable from Moonlight and append on Header or Body',
          },
          body: {
            type: ['object', 'array', 'string'],
            title: 'Body',
            description: 'Body of the Request',
          },
          printResultAfter: {
            type: 'boolean',
            title: 'Print Result After',
            description: 'Should print result as JSON after the request?',
          },
          retry: {
            type: 'boolean',
            title: 'Retry',
            description: 'Should retry the request?',
          },
          retryCount: {
            type: 'number',
            title: 'Retry Count',
            description:
              'How many times should retry the request? (default 3, max 10)',
          },
          retryDelaySeconds: {
            type: 'number',
            title: 'Retry Delay Seconds',
            description:
              'How many seconds should wait between each retry? (the default is the number of attempts * 1 second, max 60 seconds)',
          },
        },
      },
      output: {
        type: 'object',
        required: [],
        properties: {
          response_body: {
            type: 'string',
          },
          response_status_code: {
            type: 'string',
          },
        },
      },
    },
    async handler(ctx) {
      const {
        url,
        method,
        expectedStatusCode,
        environments = [],
        headers = {},
        body = {},
        printResultAfter = false,
        throwOutput = false,
        retry = false,
        retryCount = 0,
        retryDelaySeconds = 0,
      } = ctx.input;

      const { headers: reqHeader, body: reqBody } = arrangeEnvironments(
        environments,
        body,

        headers,
      );

      let retries = 3;

      if (retryCount > 0) {
        retries = retryCount > 10 ? 10 : retryCount;
      }

      const bodyString = replaceAlias(typeof reqBody === "string" ? reqBody.replace(/\\n/g, '\n') : JSON.stringify(reqBody));
      ctx.logger.debug(
        `headers:${JSON.stringify(reqHeader)},body:${bodyString}`,
      );

      try {
        const client = axios.create();

        if (retry) {
          // @ts-ignore
          axiosRetry(client, {
            retries: retries,
            retryDelay: attempt => {
              let seconds = attempt;

              if (retryDelaySeconds > 0) {
                seconds = retryDelaySeconds > 60 ? 60 : retryDelaySeconds;
              }

              return seconds * 1000;
            },
            retryCondition: ({ response }) => {
              return (
                !response?.status ||
                response?.status < 200 ||
                response?.status >= 500
              );
            },
            onRetry: count => {
              ctx.logger.warn(`Attempt ${count} of ${retries}.`);
            },
          });
        }

        if (!reqHeader['Content-Type']) {
          reqHeader['Content-Type'] = 'application/json';
        }

        const response = await client({
          url,
          method: method,
          headers: {
            ...reqHeader,
          },
          data: bodyString,
        });

        if (
          expectedStatusCode &&
          !expectedStatusCode.find(i => response.status === i)
        ) {
          throw new StatusCodeError(
            `Unexpected Status Code Received ${response.status}: ${response.statusText
            }, should be either: [${expectedStatusCode.join(',')}]`,
          );
        }

        ctx.logger.info('Request is finished');
        if (printResultAfter) {
          ctx.logger.info(JSON.stringify(response.data));
        }

        if (throwOutput) {
          ctx.output('response_body', response.data);
          ctx.output('response_status_code', response.status);
        }
      } catch (err) {
        if (axios.isAxiosError(err)) {
          if (
            expectedStatusCode &&
            expectedStatusCode.find(
              i => Number((err as AxiosError).response?.status || 0) === i,
            )
          ) {
            ctx.logger.warn(`Expected StatusCode error received, skipping...`);
            ctx.logger.error(
              (err.message && err.response) ?
                `${err.message} ${err.response?.status}:${err.response?.statusText} ${JSON.stringify(err.response?.data)}`
                : 'Http Request - An unexpected error occurred.',
            );
            return;
          }
          ctx.logger.error(
            `error details from request: ${JSON.stringify(err.response?.data)}`,
          );
          ctx.logger.error(`error full stack: ${err.stack}`);
          throw new ResponseError(
            (err.message && err.response) ?
              `${err.message} ${err.response?.status}:${err.response?.statusText}`
              : 'Http Request - An unexpected error occurred.',
          );
        }

        if (err instanceof Error) {
          throw new ResponseError(
            err.message || 'Http Request - An unexpected error occurred.',
          );
        }
      }
    },
  });
};
