import { Config } from '@backstage/config';
import express from 'express';
import Router from 'express-promise-router';
import { SlackAPIRepositoryImpl } from '../repository/SlackRepositoryImpl';
import { SlackService } from './SlackService';
import { getVoidLogger, PluginCacheManager, PluginDatabaseManager } from '@backstage/backend-common';
import * as winston from 'winston';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';

export interface RouterOptions {
  logger: winston.Logger;
  config: Config;
  cacheManager: PluginCacheManager;
  database: PluginDatabaseManager;
}

export async function createRouter(options: RouterOptions): Promise<express.Router> {
  const { logger: _logger, config, cacheManager, database } = options;
  const slackToken = config.getString('slack.token');

  const apiRepository = new SlackAPIRepositoryImpl(slackToken, cacheManager);
  const notificationRepository = await SlackNotificationRepository.create(database);
  const slackService = new SlackService(getVoidLogger(), apiRepository, notificationRepository);

  const router = Router();
  router.use(express.json({
    verify: (req: express.Request, _res, buf) => {
      (req as express.Request & { rawBody?: string }).rawBody = buf.toString();
    }
  }));
  router.use(express.urlencoded({ extended: true }));

  router.post('/notify', async (req, res) => {
    try {
      const { channelName, email, message, buttons, callback } = req.body;

      if (!message) {
        res.status(400).send('message is required');
        return;
      }

      if (!channelName && !email) {
        res.status(400).send('channelName or email is required');
        return;
      }

      if (buttons && !callback) {
        res.status(400).send('callback is required when sending buttons');
        return;
      }

      if (channelName) {
        await handleChannelNotification(req, res);
      } else if (email) {
        await handleUserNotification(req, res);
      } else {
        res.status(400).send('channelName or email is required');
      }
    } catch (error) {
      res.status(500).send(error.message);
    }
  });

  async function handleChannelNotification(req: express.Request, res: express.Response): Promise<void> {
    const { channelName, message } = req.body;
    await slackService.sendMessageToChannel(channelName, message);
    res.status(200).send('Message sent to channel');
  }

  async function handleUserNotification(req: express.Request, res: express.Response): Promise<void> {
    const { email, message, buttons, callback } = req.body;
    if (buttons) {
      if (!callback || !callback.method || !callback.url) {
        res.status(400).send('callback is required when sending buttons');
        return;
      }
      await slackService.sendMessageWithButtonsToUser(email, message, buttons, callback);
    } else {
      await slackService.sendMessageToUser(email, message);
    }
    res.status(200).send('Message sent to user');
  }


  return router;
}