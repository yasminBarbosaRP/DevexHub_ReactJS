import { EventParams, EventSubscriber } from '@backstage/plugin-events-node';
import * as winston from 'winston';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';
import axios from 'axios';

interface BlockActionsPayload {
    type: 'block_actions';
    actions?: ButtonAction[];
    // ...other properties...
}

interface ButtonAction {
    type: 'button';
    value: string;
    // ...other properties...
}

interface CallbackRequest {
    method: string;
    url: string;
    body?: any;
    headers?: any;
}

export class SlackEventsService implements EventSubscriber {
    constructor(
        private readonly logger: winston.Logger,
        private readonly notificationRepository: SlackNotificationRepository,
    ) { }

    supportsEventTopics(): string[] {
        return ["slack"];
    }

    async onEvent(params: EventParams): Promise<void> {
        const payloadOriginal = (params.eventPayload as any)?.payload ?? params.eventPayload;
        const payload = typeof payloadOriginal === 'string' ? JSON.parse(payloadOriginal) : payloadOriginal;
        if (this.isBlockActionsPayload(payload)) {
            await this.handleBlockActions(payload);
        } 
        return Promise.resolve();
    }

    private isBlockActionsPayload(payload: any): payload is BlockActionsPayload {
        return payload.type === 'block_actions';
    }

    private async handleBlockActions(payload: BlockActionsPayload): Promise<void> {
        const action = payload.actions?.[0];
        if (action?.type === 'button') {
            await this.handleButtonClick(action);
        }
    }

    private async handleButtonClick(action: ButtonAction): Promise<void> {
        const metadata = typeof action.value === 'object' ? action.value :JSON.parse(action.value);
        const { notificationId, buttonValue } = metadata;
        this.logger.info(`Button clicked with notificationId: ${notificationId}, buttonValue: ${buttonValue}`);

        const notification = await this.notificationRepository.getNotificationById(notificationId);
        if (notification?.callback_request) {
            await this.sendCallbackRequest(notificationId, notification.callback_request, buttonValue); // Pass Slack action as response
        } else {
            this.logger.warn(`Notification not found or missing callback_request for notificationId: ${notificationId}`);
        }
    }

    private async sendCallbackRequest(
        notificationId: string,
        callbackReq: CallbackRequest,
        slackResponse: any,
    ): Promise<void> {
        try {
            const response = await axios({
                method: callbackReq.method,
                url: callbackReq.url,
                data: slackResponse,
                headers: callbackReq.headers,
            });
            await this.notificationRepository.updateNotification(notificationId, {
                callback_response: {
                    body: response.data,
                    statusCode: response.status
                },
            });
            this.logger.info(`Callback request sent successfully for notificationId: ${notificationId}`);
        } catch (error) {
            this.logger.error(`Failed to send callback request for notificationId: ${notificationId}`, error);
            throw error;
        }
    }
}