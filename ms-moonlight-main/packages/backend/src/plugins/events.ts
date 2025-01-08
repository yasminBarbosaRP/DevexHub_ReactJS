import {
  HttpPostIngressEventPublisher,
} from '@backstage/plugin-events-backend';
import { Router } from 'express';
import { PluginEnvironment } from '../types';
import { createGithubSignatureValidator } from '@backstage/plugin-events-backend-module-github';
import { createSlackSignatureValidator } from '@internal/plugin-picpay-slack-backend';

export default async function createPlugin(
  env: PluginEnvironment,
): Promise<Router> {
  const eventsRouter = Router();

  const http = HttpPostIngressEventPublisher.fromConfig({
    config: env.config,
    events: env.events,
    logger: env.logger,
    ingresses: {
      github: {
        validator: createGithubSignatureValidator(env.config),
      },
      slack: {
        validator: createSlackSignatureValidator(env.config),
      }
    },
  });
  http.bind(eventsRouter);

  return eventsRouter;
}
