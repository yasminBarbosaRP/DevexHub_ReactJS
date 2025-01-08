import { SlackAPIRepository } from '../repository/SlackAPIRepository';
import * as winston from 'winston';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';
import { v4 as uuidv4 } from 'uuid';

export interface ButtonOption {
  text: string;
  value: string;
  style?: 'primary' | 'danger';
  metadata?: {
    requestId?: string;
    [key: string]: string | undefined;
  };
}

export class SlackService {
  private slackRepository: SlackAPIRepository;

  constructor(
    private readonly logger: winston.Logger,
    slackRepository: SlackAPIRepository,
    private readonly notificationRepository: SlackNotificationRepository,
  ) {
    this.slackRepository = slackRepository;
  }

  async sendMessageToChannel(channelName: string, message: string): Promise<void> {
    const channelId = await this.slackRepository.getChannelId(channelName);
    await this.slackRepository.sendMessage(channelId, message);
  }

  async sendMessageToUser(email: string, message: string): Promise<void> {
    this.logger.debug(`Sending message to user with email: ${email}`);
    const userId = await this.slackRepository.getUserIdByEmail(email);
    const notificationId = uuidv4();

    await this.notificationRepository.createNotification({
      id: notificationId,
      receiver: { email },
      payload: message,
      sent_to_receiver: false,
      created_at: new Date(),
    });

    await this.slackRepository.sendMessage(userId, message);
    await this.notificationRepository.updateNotification(notificationId, { sent_to_receiver: true });
  }

  async sendMessageWithButtonsToUser(
    email: string,
    message: string,
    buttonOptions: ButtonOption[],
    callbackRequest: {
      method: string;
      url: string;
      headers?: any;
    },
  ): Promise<void> {

    if (!callbackRequest || !callbackRequest.method || !callbackRequest.url) {
      throw new Error('Callback request must include method and url');
    }

    const userId = await this.slackRepository.getUserIdByEmail(email);
    const notificationId = uuidv4();

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message,
        },
      },
      {
        type: 'actions',
        elements: buttonOptions.map(option => ({
          type: 'button',
          text: {
            type: 'plain_text',
            text: option.text,
          },
          value: JSON.stringify({
            notificationId,
            buttonValue: option.value,
            ...option.metadata,
          }),
          action_id: option.value,
          style: option.style,
        })),
      },
    ];

    await this.notificationRepository.createNotification({
      id: notificationId,
      receiver: { email },
      payload: message,
      callback_request: callbackRequest,
      sent_to_receiver: false,
      created_at: new Date(),
    });

    await this.slackRepository.sendMessage(userId, message, blocks);
    await this.notificationRepository.updateNotification(notificationId, { sent_to_receiver: true });
  }
}