import { SchedulerService } from '@backstage/backend-plugin-api';
import {
  EventParams,
  EventsService,
  EventsServiceSubscribeOptions,
} from '@backstage/plugin-events-node';
import { Logger } from 'winston';

export class InMemoryEventsService implements EventsService {
  constructor(
    private readonly logger: Logger,
    private readonly scheduler: SchedulerService,
  ) { }

  private readonly subscribers = new Map<
    string,
    Omit<EventsServiceSubscribeOptions, 'topic'>[]
  >();

  private static readonly events: {
    [topic: string]: EventParams[];
  } = {};

  async publish(params: EventParams): Promise<void> {
    let topic = params.topic;

    if (topic === 'github') {
      // events/github POST
      topic += `.${params.metadata?.['x-github-event']}`;
    }

    InMemoryEventsService.events[topic] = InMemoryEventsService.events[topic] ?? [];
    InMemoryEventsService.events[topic].push(params);
  }

  async subscribe(options: EventsServiceSubscribeOptions): Promise<void> {
    options.topics.forEach(async topic => {
      if (!this.subscribers.has(topic)) {
        this.subscribers.set(topic, []);
      }

      this.subscribers.get(topic)!.push({
        id: options.id,
        onEvent: options.onEvent,
        topics: []
      });

      await this.scheduler.scheduleTask({
        id: `sqs-subscriber:${topic}`,
        frequency: { seconds: 0 },
        timeout: { seconds: 180 },
        scope: 'local',
        fn: async () => {
          const msgs = InMemoryEventsService.events[topic] ?? [];
          if (msgs.length > 0) {
            const subscriber = this.subscribers.get(topic)?.find(sub => sub.id === options.id);
            if (subscriber) {
              this.logger.info(
                `topic=${topic} contains message for ${subscriber.constructor.name}`,
              );
              const msg = msgs.pop() as EventParams;
              try {
                msg.topic = topic;
                await subscriber.onEvent(msg);
              } catch (err) {
                InMemoryEventsService.events[topic] =
                  InMemoryEventsService.events[topic] ?? [];
                InMemoryEventsService.events[topic].push(msg);
                this.logger.error('Failed to consume messages', err);
              }
            }
          } else {
            this.logger.info(`no new messages for ${topic}, waiting 2_000ms`);
            await this.sleep(2_000);
          }
        },
      });
    });
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
}
