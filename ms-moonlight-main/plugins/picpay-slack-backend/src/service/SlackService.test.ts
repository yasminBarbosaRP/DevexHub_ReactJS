import { ButtonOption, SlackService } from './SlackService';
import { SlackAPIRepository } from '../repository/SlackAPIRepository';
import { getVoidLogger } from '@backstage/backend-common';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.MockedFunction<typeof axios>;

mockedAxios.mockResolvedValue({ data: 'Success' });

describe('SlackService', () => {
  let slackRepository: jest.Mocked<SlackAPIRepository>;
  let slackService: SlackService;
  let notificationRepository: jest.Mocked<SlackNotificationRepository>;

  beforeEach(() => {
    slackRepository = {
      sendMessage: jest.fn(),
      getChannelId: jest.fn(),
      getUserIdByEmail: jest.fn(),
    };
    notificationRepository = {
      createNotification: jest.fn(),
      getNotificationById: jest.fn(),
      updateNotification: jest.fn(),
    } as any;
    slackService = new SlackService(getVoidLogger(), slackRepository, notificationRepository);
  });

  it('should send a message to a channel', async () => {
    slackRepository.getChannelId.mockResolvedValue('C123456');
    await slackService.sendMessageToChannel('general', 'Hello, channel!');
    expect(slackRepository.getChannelId).toHaveBeenCalledWith('general');
    expect(slackRepository.sendMessage).toHaveBeenCalledWith('C123456', 'Hello, channel!');
  });

  it('should send a message to a user', async () => {
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');
    await slackService.sendMessageToUser('user@example.com', 'Hello, user!');
    expect(slackRepository.getUserIdByEmail).toHaveBeenCalledWith('user@example.com');
    expect(slackRepository.sendMessage).toHaveBeenCalledWith('U123456', 'Hello, user!');
  });

  it('should send a message with buttons to a user', async () => {
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');
    const buttonOptions = [
      { text: 'Option 1', value: 'option1' },
      { text: 'Option 2', value: 'option2' },
    ];
    const callbackRequest = {
      method: 'POST',
      url: 'https://example.com/callback',
      body: { someData: 'value' }, // Include body
    };

    await slackService.sendMessageWithButtonsToUser(
      'user@example.com',
      'Choose an option:',
      buttonOptions,
      callbackRequest,
    );

    expect(notificationRepository.createNotification).toHaveBeenCalled();
    expect(slackRepository.sendMessage).toHaveBeenCalled();
    expect(notificationRepository.updateNotification).toHaveBeenCalledWith(expect.any(String), { sent_to_receiver: true });
  });

  it('should send a message with styled buttons to a user', async () => {
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');
    const buttonOptions: ButtonOption[] = [
      { text: 'Approve', value: 'approve', style: 'primary' },
      { text: 'Reject', value: 'reject', style: 'danger' },
      { text: 'Later', value: 'later' }, // Default style
    ];
    const callbackRequest = { method: 'GET', url: 'http://moonlight.limbo.work' };

    await slackService.sendMessageWithButtonsToUser('user@example.com', 'Please choose:', buttonOptions, callbackRequest);

    expect(slackRepository.getUserIdByEmail).toHaveBeenCalledWith('user@example.com');
    expect(slackRepository.sendMessage).toHaveBeenCalledWith(
      'U123456',
      'Please choose:',
      expect.arrayContaining([
        expect.objectContaining({
          type: 'section',
          text: { type: 'mrkdwn', text: 'Please choose:' },
        }),
        expect.objectContaining({
          type: 'actions',
          elements: expect.arrayContaining(
            buttonOptions.map(option =>
              expect.objectContaining({
                type: 'button',
                text: { type: 'plain_text', text: option.text },
                value: expect.stringContaining(`"buttonValue":"${option.value}"`),
                action_id: option.value,
                style: option.style,
              }),
            ),
          ),
        }),
      ]),
    );
  });

  it('should handle error when user not found by email', async () => {
    slackRepository.getUserIdByEmail.mockRejectedValue(new Error('User not found'));
    await expect(
      slackService.sendMessageToUser('unknown@example.com', 'Hello'),
    ).rejects.toThrow('User not found');
  });

  it('should send a message with buttons and save notification to database', async () => {
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');
    const buttonOptions = [
      { text: 'Approve', value: 'approve' },
      { text: 'Reject', value: 'reject' },
    ];
    const callbackRequest = {
      method: 'POST',
      url: 'https://example.com/callback',
      body: { data: 'test' },
    };
    await slackService.sendMessageWithButtonsToUser('user@example.com', 'Please respond:', buttonOptions, callbackRequest);

    expect(notificationRepository.createNotification).toHaveBeenCalled();
    expect(slackRepository.sendMessage).toHaveBeenCalled();
    expect(notificationRepository.updateNotification).toHaveBeenCalledWith(expect.any(String), { sent_to_receiver: true });
  });

  it('should throw an error if callbackRequest is invalid', async () => {
    await expect(
      slackService.sendMessageWithButtonsToUser(
        'user@example.com',
        'Please respond:',
        [],
        { method: 'POST', url: '' },
      ),
    ).rejects.toThrow('Callback request must include method and url');
  });

  it('should handle error when sending message to user fails', async () => {
    slackRepository.sendMessage.mockRejectedValue(new Error('Send message failed'));
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');

    await expect(
      slackService.sendMessageToUser('user@example.com', 'Hello')
    ).rejects.toThrow('Send message failed');
  });

  it('should handle error when sending message to channel fails', async () => {
    slackRepository.sendMessage.mockRejectedValue(new Error('Send message failed'));
    slackRepository.getChannelId.mockResolvedValue('C123456');

    await expect(
      slackService.sendMessageToChannel('general', 'Hello channel')
    ).rejects.toThrow('Send message failed');
  });

  it('should handle sending message with buttons failing', async () => {
    slackRepository.sendMessage.mockRejectedValue(new Error('Send message failed'));
    slackRepository.getUserIdByEmail.mockResolvedValue('U123456');

    const buttonOptions: ButtonOption[] = [
      { text: 'Yes', value: 'yes' },
      { text: 'No', value: 'no' },
    ];
    const callbackRequest = {
      method: 'POST',
      url: 'https://example.com/callback',
      body: { key: 'value' }, // Provide a body since method is POST
    };

    await expect(
      slackService.sendMessageWithButtonsToUser(
        'user@example.com',
        'Please choose an option:',
        buttonOptions,
        callbackRequest
      )
    ).rejects.toThrow('Send message failed');
  });
});