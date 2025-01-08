import { SlackEventsService } from './SlackEventsService';
import { getVoidLogger } from '@backstage/backend-common';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = jest.mocked(axios);

describe('SlackEventsService', () => {
  let service: SlackEventsService;
  let notificationRepository: jest.Mocked<SlackNotificationRepository>;

  beforeEach(() => {
    notificationRepository = {
      getNotificationById: jest.fn(),
      updateNotification: jest.fn(),
    } as any;
    service = new SlackEventsService(getVoidLogger(), notificationRepository);
    jest.clearAllMocks();
  });

  describe('onEvent', () => {
    it('handles button click events and sends callback with slack response', async () => {
      const slackAction = {
        type: 'button',
        value: JSON.stringify({
          notificationId: '123',
          buttonValue: 'approve'
        })
      };

      const mockNotification = {
        id: '123',
        receiver: 'slack',
        payload: '{}',
        sent_to_receiver: true,
        created_at: new Date(),
        callback_request: {
          method: 'POST',
          url: 'https://api.example.com/callback',
          headers: { 'Content-Type': 'application/json' }
        }
      };

      notificationRepository.getNotificationById.mockResolvedValue(mockNotification);
      mockedAxios.mockResolvedValueOnce({ data: { status: 'success' } });

      await service.onEvent({
        topic: 'slack',
        eventPayload: {
          type: 'block_actions',
          actions: [slackAction]
        }
      });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/callback',
        data: 'approve',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(notificationRepository.updateNotification).toHaveBeenCalledWith(
        '123',
        {
          callback_response: {
            body: { status: 'success' },
            statusCode: undefined
          }
        }
      );
    });

    it('handles button click events and sends callback with slack response with payload', async () => {
      const slackAction = {
        type: 'button',
        value: JSON.stringify({
          notificationId: '123',
          buttonValue: 'approve'
        })
      };

      const mockNotification = {
        id: '123',
        receiver: 'slack',
        payload: '{}',
        sent_to_receiver: true,
        created_at: new Date(),
        callback_request: {
          method: 'POST',
          url: 'https://api.example.com/callback',
          headers: { 'Content-Type': 'application/json' }
        }
      };

      notificationRepository.getNotificationById.mockResolvedValue(mockNotification);
      mockedAxios.mockResolvedValueOnce({ data: { status: 'success' } });

      await service.onEvent({
        topic: 'slack',
        eventPayload: {
          payload: {
            type: 'block_actions',
            actions: [slackAction]
          }
        }
      });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/callback',
        data: 'approve',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(notificationRepository.updateNotification).toHaveBeenCalledWith(
        '123',
        {
          callback_response: {
            body: { status: 'success' },
            statusCode: undefined
          }
        }
      );
    });


    it('handles button click events and sends callback with slack response with payload as string', async () => {
      const slackAction = {
        type: 'button',
        value: JSON.stringify({
          notificationId: '123',
          buttonValue: 'approve'
        })
      };

      const mockNotification = {
        id: '123',
        receiver: 'slack',
        payload: '{}',
        sent_to_receiver: true,
        created_at: new Date(),
        callback_request: {
          method: 'POST',
          url: 'https://api.example.com/callback',
          headers: { 'Content-Type': 'application/json' }
        }
      };

      notificationRepository.getNotificationById.mockResolvedValue(mockNotification);
      mockedAxios.mockResolvedValueOnce({ data: { status: 'success' } });

      await service.onEvent({
        topic: 'slack',
        eventPayload: {
          payload: JSON.stringify({
            type: 'block_actions',
            actions: [slackAction]
          })
        }
      });

      expect(mockedAxios).toHaveBeenCalledWith({
        method: 'POST',
        url: 'https://api.example.com/callback',
        data: 'approve',
        headers: { 'Content-Type': 'application/json' }
      });

      expect(notificationRepository.updateNotification).toHaveBeenCalledWith(
        '123',
        {
          callback_response: {
            body: { status: 'success' },
            statusCode: undefined
          }
        }
      );
    });

    it('handles missing notification gracefully', async () => {
      const slackAction = {
        type: 'button',
        value: JSON.stringify({
          notificationId: '123',
          buttonValue: 'approve'
        })
      };

      notificationRepository.getNotificationById.mockResolvedValue(undefined);

      await service.onEvent({
        topic: 'slack',
        eventPayload: {
          type: 'block_actions',
          actions: [slackAction]
        }
      });

      expect(mockedAxios).not.toHaveBeenCalled();
      expect(notificationRepository.updateNotification).not.toHaveBeenCalled();
    });

    it('handles callback request failure', async () => {
      const slackAction = {
        type: 'button',
        value: JSON.stringify({
          notificationId: '123',
          buttonValue: 'approve'
        })
      };

      const mockNotification = {
        id: '123',
        receiver: 'slack',
        payload: '{}',
        sent_to_receiver: true,
        created_at: new Date(),
        callback_request: {
          method: 'POST',
          url: 'https://api.example.com/callback'
        }
      };

      notificationRepository.getNotificationById.mockResolvedValue(mockNotification);
      mockedAxios.mockRejectedValueOnce(new Error('Network error'));

      await expect(
        service.onEvent({
          topic: 'slack',
          eventPayload: {
            type: 'block_actions',
            actions: [slackAction]
          }
        })
      ).rejects.toThrow('Network error');

      expect(notificationRepository.updateNotification).not.toHaveBeenCalled();
    });

    it('ignores events with unsupported type', async () => {
      await service.onEvent({
        topic: 'slack',
        eventPayload: {
          type: 'unsupported_type',
        },
      });

      expect(notificationRepository.getNotificationById).not.toHaveBeenCalled();
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('handles button click with invalid JSON value', async () => {
      const slackAction = {
        type: 'button',
        value: 'invalid json',
      };

      await expect(
        service.onEvent({
          topic: 'slack',
          eventPayload: {
            type: 'block_actions',
            actions: [slackAction],
          },
        })
      ).rejects.toThrow(SyntaxError);

      expect(notificationRepository.getNotificationById).not.toHaveBeenCalled();
      expect(mockedAxios).not.toHaveBeenCalled();
    });

    it('handles block actions without actions array', async () => {
      const eventPayload = {
        type: 'block_actions',
      };

      await service.onEvent({
        topic: 'slack',
        eventPayload: eventPayload,
      });

      expect(notificationRepository.getNotificationById).not.toHaveBeenCalled();
      expect(mockedAxios).not.toHaveBeenCalled();
    });
  });
});