/*
 * Copyright 2022 The Backstage Authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Config } from '@backstage/config';
import {
  EventParams,
  EventsService,
  EventsServiceSubscribeOptions,
} from '@backstage/plugin-events-node';
import { Logger } from 'winston';
import { SchedulerService } from '@backstage/backend-plugin-api';
import { AwsSqsEventSourceConfig, readConfig } from './config';
import { CatalogClient, CatalogApi } from '@backstage/catalog-client';
import fetch from 'cross-fetch';

import {
  DeleteMessageBatchCommand,
  Message,
  ReceiveMessageCommand,
  ReceiveMessageCommandInput,
  SQSClient,
  SendMessageCommand,
  SQSClientConfig,
} from '@aws-sdk/client-sqs';
import { stringifyEntityRef } from '@backstage/catalog-model';


interface Commit {
  added: string[];
  removed: string[];
  modified: string[];
}

/**
 * In-process event broker which will pass the event to all registered subscribers
 * interested in it.
 * Events will not be persisted in any form.
 * Events will not be passed to subscribers at other instances of the same cluster.
 *
 * @public
 */
// TODO(pjungermann): add opentelemetry? (see plugins/catalog-backend/src/util/opentelemetry.ts, etc.)

export class SqsEventsService implements EventsService {
  private static readonly subscribers = new Map<
    string,
    Omit<EventsServiceSubscribeOptions, 'topic'>[]
  >();

  private readonly receiveParams: ReceiveMessageCommandInput;
  private readonly sqs: SQSClient;
  private readonly queueUrl: string;
  private readonly taskTimeoutSeconds: number;
  private readonly waitTimeAfterEmptyReceiveMs;

  static fromConfig(env: {
    config: Config;
    logger: Logger;
    catalog: CatalogClient;
    scheduler: SchedulerService;
  }): SqsEventsService {
    return new SqsEventsService(
      env.logger,
      env.scheduler,
      env.catalog,
      env.config.getString('backend.baseUrl'),
      readConfig(env.config),
    );
  }

  private constructor(
    private readonly logger: Logger,
    private readonly scheduler: SchedulerService,
    private readonly catalogApi: CatalogApi,
    private readonly backendUrl: string,
    awsConfig: AwsSqsEventSourceConfig,
  ) {
    this.receiveParams = {
      MaxNumberOfMessages: 10,
      MessageAttributeNames: ['All'],
      QueueUrl: awsConfig.queueUrl,
      VisibilityTimeout: awsConfig.visibilityTimeout?.as('seconds'),
      WaitTimeSeconds: awsConfig.pollingWaitTime.as('seconds'),
    };

    this.logger.info(
      `configuring sqs to receive from ${awsConfig.region} on ${awsConfig.queueUrl}`,
    );

    const sqsConfig: SQSClientConfig = {
      region: awsConfig.region,
    };

    this.sqs = new SQSClient(sqsConfig);

    this.queueUrl = awsConfig.queueUrl;
    this.taskTimeoutSeconds = awsConfig.timeout.as('seconds');
    this.waitTimeAfterEmptyReceiveMs = awsConfig.waitTimeAfterEmptyReceive.as('milliseconds');
  }

  /**
  * Returns a plugin-scoped context of the `EventService`
  * that ensures to prefix subscriber IDs with the plugin ID.
  *
  * @param pluginId - The plugin that the `EventService` should be created for.
  */
  forPlugin(pluginId: string): EventsService {
    return {
      publish: (params: EventParams): Promise<void> => {
        return this.publish(params);
      },
      subscribe: (options: EventsServiceSubscribeOptions): Promise<void> => {
        return this.subscribe({
          ...options,
          id: `${pluginId}.${options.id}`,
        });
      },
    };
  }

  async publish(params: EventParams): Promise<void> {
    this.logger.debug(
      `Event received: topic=${params.topic}, metadata=${JSON.stringify(
        params.metadata,
      )}, payload=${JSON.stringify(params.eventPayload)}`,
    );

    if (params.topic === 'github') {
      // events/github POST
      params.topic += `.${params.metadata?.['x-github-event']}`;
    }

    if (!SqsEventsService.subscribers.has(params.topic)) {
      this.logger.debug(`No subscribers for topic ${params.topic}, skipping event`);
      return;
    }

    const payload: any = params.eventPayload as any;

    this.logger.debug(`Event received: full-topic=${params.topic}`);
    this.logger.debug(`Event is from_repo ${payload?.repository?.name}`);
    let skipSendEvent = false;
    if (
      (payload?.repository?.name?.toString() as string)?.startsWith(
        'moonlight-',
      ) &&
      this.isCorrectRef(payload.ref as string)
    ) {
      const branchPaths = (payload.ref as string).split('/');
      skipSendEvent = await this.refreshRepository(
        payload?.repository?.name as string,
        branchPaths[branchPaths.length - 1],
        ((payload.commits as Commit[]) || []).reduce(
          (accumulator: any, commit: any) => {
            return [
              ...accumulator,
              ...commit.added,
              ...commit.removed,
              ...commit.modified,
            ];
          },
          [],
        ),
      );
      return;
    }

    if (skipSendEvent) {
      this.logger.debug(`skip sending event to sqs`);
      return;
    }
    await this.sqs.send(
      new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(params),
        MessageAttributes: {
          Topic: { StringValue: params.topic, DataType: 'String' },
        },
      }),
    );
  }

  async subscribe(options: EventsServiceSubscribeOptions): Promise<void> {
    options.topics.forEach(async topic => {
      if (!SqsEventsService.subscribers.has(topic)) {
        SqsEventsService.subscribers.set(topic, []);
      }

      SqsEventsService.subscribers.get(topic)!.push({
        id: options.id,
        onEvent: options.onEvent,
        topics: []
      });

      const logger = this.logger.child({
        class: SqsEventsService.prototype.constructor.name,
        taskId: `sqs-subscriber:${topic}`,
      });
      logger.info(`${topic} subscribed to receive events`);

      await this.scheduler.scheduleTask({
        id: `sqs-subscriber:${topic}`,
        frequency: { seconds: 0 },
        timeout: { seconds: this.taskTimeoutSeconds },
        scope: 'local',
        fn: async () => {
          try {
            const numMessages = await this.consumeMessages();
            if (numMessages === 0) {
              logger.info(
                `No events received, sleeping for ${this.waitTimeAfterEmptyReceiveMs}`,
              );
              await this.sleep(this.waitTimeAfterEmptyReceiveMs);
            }
          } catch (error) {
            logger.error('Failed to consume AWS SQS messages', error);
          }
        },
      });
    });
  }

  private async refreshRepository(
    repository: string,
    branch: string,
    filesUpdated: string[] = [],
  ): Promise<boolean> {
    let refreshHappened = false;
    try {
      const yamlChanged = filesUpdated.filter(
        e => e.endsWith('.yml') || e.endsWith('.yaml'),
      );
      this.logger.debug(
        `files changed for ${repository}/tree/${branch} are selected:${JSON.stringify(
          yamlChanged,
        )} from:${JSON.stringify(filesUpdated)}`,
      );
      const entities = await this.catalogApi.getEntities({
        filter: [
          {
            'metadata.annotations.backstage.io/source-location': `url:https://github.com/PicPay/${repository}/tree/${branch}/`,
          },
          ...(yamlChanged.length > 0
            ? yamlChanged.map(file => ({
              'metadata.annotations.backstage.io/managed-by-location': `url:https://github.com/PicPay/${repository}/tree/${branch}/${file}`,
            }))
            : []),
        ],
      });

      for (const entity of entities.items) {
        this.logger.debug(`refreshing entity ${stringifyEntityRef(entity)}`);
        await fetch(
          `${this.backendUrl}/api/catalog/entities/refresh-state/force/${entity.kind
          }/${entity.metadata.namespace ?? 'default'}/${entity.metadata.name}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              seconds: -90000,
            }),
          },
        )
          .then(res => res.json())
          .then(json => {
            this.logger.debug(
              `refreshed entity ${stringifyEntityRef(
                entity,
              )} with result ${JSON.stringify(json)}`,
            );
            return json;
          });
      }

      if (entities.items.length > 0) refreshHappened = true;
    } catch (err) {
      this.logger.warn(`error while refreshing templates ${err}`);
    }

    return Promise.resolve(refreshHappened);
  }

  // @ts-ignore
  private async deleteMessages(messages?: Message[]): Promise<void> {
    if (!messages) {
      this.logger.debug(`sqs-delete-message: no messages to delete`);
      return;
    }

    const deleteParams = {
      QueueUrl: this.queueUrl,
      Entries: messages.map((message, index) => {
        return {
          Id: message.MessageId ?? `message-${index}`,
          ReceiptHandle: message.ReceiptHandle,
        };
      }),
    };

    try {
      this.logger.debug(
        `sqs-delete-message: deleting ${messages.length} messages`,
      );
      const result = await this.sqs.send(
        new DeleteMessageBatchCommand(deleteParams),
      );
      if (result.Failed) {
        this.logger.error(
          `Failed to delete ${result.Failed!.length} of ${messages.length
          } messages from AWS SQS ${this.queueUrl}. First: ${result.Failed[0]?.Message
          }`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to delete message from AWS SQS ${this.queueUrl}`,
        error,
      );
    }
  }

  private async consumeMessages(): Promise<number> {
    try {
      const data = await this.sqs.send(
        new ReceiveMessageCommand(this.receiveParams),
      );

      data.Messages?.forEach(async message => {
        const eventPayload: EventParams = JSON.parse(message.Body!);

        const metadata: Record<string, string | string[]> = {};
        Object.keys(message.MessageAttributes ?? {}).forEach(key => {
          const attrValue = message.MessageAttributes![key];
          if (
            !attrValue ||
            !attrValue.DataType ||
            !['String', 'Number'].includes(attrValue.DataType)
          ) {
            return;
          }

          const value = attrValue.StringListValues ?? attrValue.StringValue;
          if (value !== undefined) {
            metadata[key] = value;
          }
        });

        this.logger.info(`event received from ${metadata.Topic}`);
        const subscribed = SqsEventsService.subscribers.get(metadata.Topic as string) ?? [];
        await Promise.all(
          subscribed.map(async subscriber => {
            try {
              this.logger.debug(
                `${subscriber.constructor.name} received body ${JSON.stringify(
                  eventPayload,
                )}`,
              );
              await subscriber.onEvent(eventPayload);
            } catch (error) {
              this.logger.error(
                `Subscriber "${subscriber.constructor.name}" failed to process event`,
                error,
              );
            }
          }),
        );
      });
      await this.deleteMessages(data.Messages);
      return data.Messages?.length ?? 0;
    } catch (error) {
      this.logger.error(
        `Failed to receive events from AWS SQS ${this.queueUrl}`,
        error,
      );
      return 0;
    }
  }

  private isCorrectRef(ref: string): boolean {
    if (ref.endsWith('qa') && process.env.NODE_ENV === 'homolog') {
      return true;
    }

    if (
      process.env.NODE_ENV === 'production' &&
      (ref.endsWith('main') || ref.endsWith('master'))
    ) {
      return true;
    }

    return false;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => setTimeout(resolve, ms));
  }
}
