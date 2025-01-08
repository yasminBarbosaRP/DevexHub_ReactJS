import { SlackAPIRepositoryImpl } from './SlackRepositoryImpl';
import { WebClient } from '@slack/web-api';
import { PluginCacheManager, CacheClient } from '@backstage/backend-common';

jest.mock('@slack/web-api', () => ({
  WebClient: jest.fn().mockImplementation(() => ({})),
}));

describe('SlackRepositoryImpl', () => {
  let slackRepository: SlackAPIRepositoryImpl;
  let slackClientMock: jest.Mocked<WebClient>;
  let pluginCacheManagerMock: jest.Mocked<PluginCacheManager>;
  let cacheClientMock: jest.Mocked<CacheClient>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Mock the Slack WebClient
    slackClientMock = {
      chat: {
        postMessage: jest.fn(),
      },
      conversations: {
        list: jest.fn(),
      },
      users: {
        lookupByEmail: jest.fn(),
      },
    } as unknown as jest.Mocked<WebClient>;

    // Mock the WebClient constructor to return our mock
    (WebClient as unknown as jest.Mock).mockReturnValue(slackClientMock);

    // Mock the CacheClient methods
    cacheClientMock = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<CacheClient>;

    // Mock the PluginCacheManager to return our CacheClient mock
    pluginCacheManagerMock = {
      getClient: jest.fn().mockReturnValue(cacheClientMock),
    } as unknown as jest.Mocked<PluginCacheManager>;

    // Instantiate SlackRepositoryImpl with the mocked cache manager
    slackRepository = new SlackAPIRepositoryImpl('test-token', pluginCacheManagerMock);

    (slackClientMock as any).conversations = {
      list: jest.fn().mockResolvedValue({
        channels: [{ id: 'C123456', name: 'general' }],
      }),
    };
    (slackClientMock as any).users = {
      lookupByEmail: jest.fn().mockResolvedValue({
        user: { id: 'U123456' },
      }),
    };
  });

  it('should send a message', async () => {
    (slackClientMock as any).chat = {
      postMessage: jest.fn().mockResolvedValue({}),
    };

    await slackRepository.sendMessage('C123456', 'Hello');
    expect(slackClientMock.chat.postMessage).toHaveBeenCalledWith({
      channel: 'C123456',
      text: 'Hello',
    });
  });

  it('should send a message with blocks', async () => {
    (slackClientMock as any).chat = {
      postMessage: jest.fn().mockResolvedValue({}),
    } as any;

    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Message with buttons',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Button 1',
            },
            value: 'button1',
            action_id: 'button1',
          },
          {
            type: 'button',
            text: {
              type: 'plain_text',
              text: 'Button 2',
            },
            value: 'button2',
            action_id: 'button2',
          },
        ],
      },
    ];

    await slackRepository.sendMessage('U123456', 'Message with buttons', blocks);

    expect(slackClientMock.chat.postMessage).toHaveBeenCalledWith({
      channel: 'U123456',
      text: 'Message with buttons',
      blocks,
    });
  });

  it('should get channel ID by name', async () => {
    (slackClientMock.conversations.list as jest.Mock).mockResolvedValue({
      channels: [{ id: 'C123456', name: 'general' }],
      response_metadata: {},
    } as any);
    cacheClientMock.get.mockResolvedValueOnce(null);
    cacheClientMock.get.mockResolvedValueOnce('C123456');

    const channelId = await slackRepository.getChannelId('general');

    expect(slackClientMock.conversations.list).toHaveBeenCalledWith({
      exclude_archived: true,
      limit: 1000,
    });
    expect(channelId).toEqual('C123456');
  });

  it('should throw an error if channel not found', async () => {
    (slackClientMock as any).conversations = {
      list: jest.fn().mockResolvedValue({ channels: [] }),
    } as any;

    await expect(slackRepository.getChannelId('unknown-channel')).rejects.toThrow(
      'Channel unknown-channel not found',
    );
  });

  it('should get user ID by email', async () => {
    (slackClientMock.users.lookupByEmail as jest.Mock).mockResolvedValue({
      user: { id: 'U123456' },
    } as any);
    cacheClientMock.get.mockResolvedValueOnce(null);

    const userId = await slackRepository.getUserIdByEmail('user@example.com');
    expect(slackClientMock.users.lookupByEmail).toHaveBeenCalledWith({
      email: 'user@example.com',
    });
    expect(userId).toEqual('U123456');
  });

  it('should throw an error if user not found', async () => {
    (slackClientMock as any).users = {
      lookupByEmail: jest.fn().mockResolvedValue({}),
    } as any;

    await expect(slackRepository.getUserIdByEmail('unknown@example.com')).rejects.toThrow(
      'User with email unknown@example.com not found',
    );
  });

  it('should initialize Slack WebClient with correct options', () => {
    expect(WebClient).toHaveBeenCalledWith('test-token', {
      agent: expect.any(Object),
      rejectRateLimitedCalls: true,
      retryConfig: { maxRetryTime: 1 },
      timeout: 5000,
    });
  });

  it('should handle error when sending message fails', async () => {
    (slackClientMock as any).chat = {
      postMessage: jest.fn().mockRejectedValue(new Error('Slack API error')),
    } as any;

    await expect(slackRepository.sendMessage('C123456', 'Hello')).rejects.toThrow(
      'Slack API error',
    );
  });

  it('should handle error when getUserIdByEmail fails', async () => {
    (slackClientMock as any).users = {
      lookupByEmail: jest.fn().mockRejectedValue(new Error('Slack API error')),
    } as any;

    await expect(
      slackRepository.getUserIdByEmail('user@example.com'),
    ).rejects.toThrow('Slack API error');
  });

  it('should use cache when getting channel ID', async () => {
    cacheClientMock.get.mockResolvedValueOnce(true);
    cacheClientMock.get.mockResolvedValueOnce('C123456');

    const channelId = await slackRepository.getChannelId('general');

    expect(cacheClientMock.get).toHaveBeenCalledWith('slack:channel:general');
    expect(slackClientMock.conversations.list).not.toHaveBeenCalled();
    expect(channelId).toEqual('C123456');
  });

  it('should cache channel ID after fetching', async () => {
    cacheClientMock.get.mockResolvedValueOnce(null);
    cacheClientMock.get.mockResolvedValueOnce('C123456');
    (slackClientMock.conversations.list as jest.Mock).mockResolvedValue({
      channels: [{ id: 'C123456', name: 'general' }],
      response_metadata: {},
    } as any);

    await slackRepository.getChannelId('general');

    expect(cacheClientMock.set).toHaveBeenCalledWith('slack:channel:general', 'C123456');
  });

  it('should handle errors when caching fails', async () => {
    cacheClientMock.set.mockRejectedValueOnce(new Error('Cache set failed'));
    (slackClientMock.users.lookupByEmail  as jest.Mock).mockResolvedValue({
      user: { id: 'U123456' },
    });

    const userId = await slackRepository.getUserIdByEmail('user@example.com');

    expect(userId).toEqual('U123456');
  });
});