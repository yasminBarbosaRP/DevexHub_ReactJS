import { PluginTaskScheduler } from '@backstage/backend-tasks';
import {
  EventBroker,
  EventParams,
  EventSubscriber,
} from '@backstage/plugin-events-node';
import { Logger } from 'winston';

export class InMemoryEventBroker implements EventBroker {
  constructor(
    private readonly logger: Logger,
    private readonly scheduler: PluginTaskScheduler,
  ) {}

  private readonly subscribers: {
    [topic: string]: EventSubscriber[];
  } = {};

  private static readonly events: {
    [topic: string]: EventParams[];
  } = {};

  async publish(params: EventParams): Promise<void> {
    let topic = params.topic;

    if (topic === 'github') {
      // events/github POST
      topic += `.${params.metadata?.['x-github-event']}`;
    }

    InMemoryEventBroker.events[topic] = InMemoryEventBroker.events[topic] ?? [];
    InMemoryEventBroker.events[topic].push(params);
  }

  subscribe(
    ...subscribers: Array<EventSubscriber | Array<EventSubscriber>>
  ): void {
    subscribers.flat().forEach(subscriber => {
      subscriber.supportsEventTopics().forEach(async topic => {
        this.logger.info(`subscribed reached ${topic}`);
        this.subscribers[topic] = this.subscribers[topic] ?? [];
        this.subscribers[topic].push(subscriber);

        await this.scheduler.scheduleTask({
          id: `sqs-subscriber:${topic}`,
          frequency: { seconds: 0 },
          timeout: { seconds: 180 },
          scope: 'local',
          fn: async () => {
            const msgs = InMemoryEventBroker.events[topic] ?? [];
            if (msgs.length > 0) {
              this.logger.info(
                `topic=${topic} contains message for ${subscriber.constructor.name}`,
              );
              const msg = msgs.pop() as EventParams;
              try {
                msg.topic = topic;
                await subscriber.onEvent(msg);
              } catch (err) {
                InMemoryEventBroker.events[topic] =
                  InMemoryEventBroker.events[topic] ?? [];
                InMemoryEventBroker.events[topic].push(msg);
                this.logger.error('Failed to consume messages', err);
              }
            } else {
              this.logger.info(`no new messages for ${topic}, waiting 2_000ms`);
              await this.sleep(2_000);
            }
          },
        });
      });
    });
  }
  private sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
}
