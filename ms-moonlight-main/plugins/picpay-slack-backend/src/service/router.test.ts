/**
 * @jest-environment node
 */

import express from 'express';
import request from 'supertest';
import { createRouter } from './router';
import { Config } from '@backstage/config';
import { SlackService } from './SlackService';
import { Logger } from 'winston';
import { getVoidLogger } from '@backstage/backend-common';
import { SlackAPIRepositoryImpl } from '../repository/SlackRepositoryImpl';
import { SlackNotificationRepository } from '../repository/SlackNotificationRepository';
import { TestDatabaseId, TestDatabases } from '@backstage/backend-test-utils';

jest.mock('../repository/SlackRepositoryImpl');
jest.mock('../repository/SlackNotificationRepository');

describe('notify router', () => {
  let app: express.Express;
  let slackRepositoryMock: jest.Mocked<SlackAPIRepositoryImpl>;
  let notificationRepositoryMock: jest.Mocked<SlackNotificationRepository>;
  const databases = TestDatabases.create({ ids: ['SQLITE_3'] });
  const databaseId: TestDatabaseId = 'SQLITE_3';

  beforeAll(async () => {
    const logger: Logger = getVoidLogger();
    const knex = await databases.init(databaseId);

    await knex.schema.createTable('slack_notifications', table => {
      table.uuid('id').primary().notNullable();
      table.jsonb('receiver').notNullable();
      table.string('payload').notNullable();
      table.jsonb('callback_request').nullable();
      table.jsonb('callback_response').nullable();
      table.boolean('sent_to_receiver').notNullable().defaultTo(false);
      table.timestamp('created_at').notNullable().defaultTo(knex.fn.now());
    });

    const config: Config = {
      getString: jest.fn().mockReturnValue('test-token'),
      getOptionalString: jest.fn().mockReturnValue('test-secret'),
      get: jest.fn(),
    } as any;


    slackRepositoryMock = {
      sendMessage: jest.fn(),
      getChannelId: jest.fn().mockResolvedValue('C123456'),
      getUserIdByEmail: jest.fn().mockResolvedValue('U123456'),
    } as any;

    notificationRepositoryMock = {
      createNotification: jest.fn(),
      getNotificationById: jest.fn(),
      updateNotification: jest.fn()
    } as any;

    SlackNotificationRepository.create = jest.fn().mockResolvedValue(notificationRepositoryMock);

    (SlackAPIRepositoryImpl as jest.Mock).mockImplementation(() => slackRepositoryMock);
    ((SlackNotificationRepository as unknown) as jest.Mock).mockImplementation(() => notificationRepositoryMock);

    const notifyRouter = await createRouter({
      logger,
      config,
      cacheManager: {} as any,
      database: {
        getClient: async () => knex,
      },
    });
    app = express().use(notifyRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should send message via /notify endpoint to channel', async () => {
    const response = await request(app)
      .post('/notify')
      .send({ channelName: 'general', message: 'Test message' });

    expect(response.status).toEqual(200);
    expect(slackRepositoryMock.getChannelId).toHaveBeenCalledWith('general');
    expect(slackRepositoryMock.sendMessage).toHaveBeenCalledWith('C123456', 'Test message');
  });

  it('should send message via /notify endpoint to user', async () => {
    const sendMessageToUserSpy = jest
      .spyOn(SlackService.prototype, 'sendMessageToUser')
      .mockResolvedValue(undefined);

    const response = await request(app)
      .post('/notify')
      .send({ email: 'user@example.com', message: 'Test message' });

    expect(response.status).toEqual(200);
    expect(sendMessageToUserSpy).toHaveBeenCalledWith('user@example.com', 'Test message');
  });

  it('should send message with buttons via /notify endpoint to user', async () => {
    const response = await request(app)
      .post('/notify')
      .send({
        email: 'user@example.com',
        message: 'Please choose an option:',
        buttons: [
          { text: 'Yes', value: 'yes' },
          { text: 'No', value: 'no' },
        ],
        callback: {
          method: 'POST',
          url: 'https://example.com/callback',
          body: { foo: 'bar' },
        },
      });

    expect(response.status).toEqual(200);
    expect(slackRepositoryMock.getUserIdByEmail).toHaveBeenCalledWith('user@example.com');
    expect(slackRepositoryMock.sendMessage).toHaveBeenCalled();
    expect(notificationRepositoryMock.createNotification).toHaveBeenCalled();
    expect(notificationRepositoryMock.updateNotification).toHaveBeenCalled();
  });

  it('should handle error when neither channelName nor email is provided', async () => {
    const response = await request(app)
      .post('/notify')
      .send({ message: 'Test message' });
    expect(response.status).toEqual(400);
    expect(response.text).toEqual('channelName or email is required');
  });


  it('should handle errors thrown in routes', async () => {
    jest.spyOn(SlackService.prototype, 'sendMessageToChannel').mockRejectedValue(new Error('Test error'));

    const response = await request(app)
      .post('/notify')
      .send({ channelName: 'general', message: 'Test message' });

    expect(response.status).toEqual(500);
    expect(response.text).toContain('Test error');
  });

  it('should require callback when sending buttons', async () => {
    const response = await request(app)
      .post('/notify')
      .send({
        email: 'user@example.com',
        message: 'Please choose an option:',
        buttons: [
          { text: 'Yes', value: 'yes' },
          { text: 'No', value: 'no' },
        ],
      });
    expect(response.status).toEqual(400);
    expect(response.text).toEqual('callback is required when sending buttons');
  });

  it('should send message with buttons to user when callback is provided', async () => {
    const sendMessageWithButtonsToUser = jest.spyOn(SlackService.prototype, 'sendMessageWithButtonsToUser');
    const response = await request(app)
      .post('/notify')
      .send({
        email: 'user@example.com',
        message: 'Please choose an option:',
        buttons: [
          { text: 'Yes', value: 'yes' },
          { text: 'No', value: 'no' },
        ],
        callback: {
          method: 'POST',
          url: 'https://example.com/callback',
          body: { foo: 'bar' },
        },
      });
    expect(response.status).toEqual(200);
    expect(sendMessageWithButtonsToUser).toHaveBeenCalledWith(
      'user@example.com',
      'Please choose an option:',
      [
        { text: 'Yes', value: 'yes' },
        { text: 'No', value: 'no' },
      ],
      {
        method: 'POST',
        url: 'https://example.com/callback',
        body: { foo: 'bar' },
      },
    );
  });

  it('should handle invalid request payload', async () => {
    const response = await request(app)
      .post('/notify')
      .send({ invalid: 'payload' });

    expect(response.status).toEqual(400);
    expect(response.text).toEqual('message is required');
  });

  it('should handle missing message in request', async () => {
    const response = await request(app)
      .post('/notify')
      .send({ email: 'user@example.com' });

    expect(response.status).toEqual(400);
    expect(response.text).toEqual('message is required');
  });

  it('should handle error when sending message with buttons fails', async () => {
    jest.spyOn(SlackService.prototype, 'sendMessageWithButtonsToUser').mockRejectedValue(new Error('Failed to send message with buttons'));

    const response = await request(app)
      .post('/notify')
      .send({
        email: 'user@example.com',
        message: 'Please choose an option:',
        buttons: [
          { text: 'Yes', value: 'yes' },
        ],
        callback: {
          method: 'POST',
          url: 'https://example.com/callback',
        },
      });

    expect(response.status).toEqual(500);
    expect(response.text).toContain('Failed to send message with buttons');
  });

});
