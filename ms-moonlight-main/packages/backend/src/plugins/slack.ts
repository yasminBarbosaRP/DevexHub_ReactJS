import { createRouter, SlackEventsService, SlackNotificationRepository } from '@internal/plugin-picpay-slack-backend';
import { PluginEnvironment } from '../types';

export default async function createPlugin(env: PluginEnvironment) {
  const notificationRepository = await SlackNotificationRepository.create(env.database);
  const slackEventsService = new SlackEventsService(
    env.logger.child({ plugin: 'slack-events' }),
    notificationRepository,
  );

  env.events.subscribe({
    id: 'slack-events',
    topics: ['slack'],
    onEvent: slackEventsService.onEvent.bind(slackEventsService),
  })

  return createRouter({
    logger: env.logger,
    config: env.config,
    cacheManager: env.cache,
    database: env.database
  });
}
