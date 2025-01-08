import { FausthanosClient } from './fausthanosClient';
import { Config } from '@backstage/config';
import { Logger } from 'winston';

describe('FausthanosClient', () => {
  let client: FausthanosClient;
  let mockConfig: Config;
  let mockLogger: Logger;
  beforeEach(() => {
    mockConfig = {
      getConfig: jest.fn(),
    } as unknown as Config;
    mockLogger = {
      info: jest.fn(),
      error: jest.fn(),
    } as unknown as Logger;
    client = new FausthanosClient({
      config: mockConfig,
      logger: mockLogger,
    });
  });
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Should get All', async () => {
    const mockData = [
      {
        componet: {
          id: 'test-id',
          name: 'test-name',
        },
        requestedBy: 'test-requestedBy',
        reviewers: [
          {
            githubProfile: 'test-githubProfile',
            email: 'test1@picpay.com',
            approved: true,
          },
          {
            githubProfile: 'test-githubProfile',
            email: 'test2@picpay.com',
            approved: true,
          },
        ],
        status: 'test-status',
        requestType: 'test-requestType',
        owner: 'test-owner',
        steps: [
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
        ],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
    ];
    const spy = jest
      .spyOn(client as any, 'fetchPaginateAll')
      .mockResolvedValue(mockData);

    const result = await client.getAll();

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should get Status', async () => {
    const mockData = {
      has_next_page: true,
      limit: 1,
      error: false,
      message: 'test-message',
      data: {
        componet: {
          id: 'test-id',
          name: 'test-name',
        },
        requestedBy: 'test-requestedBy',
        reviewers: [
          {
            githubProfile: 'test-githubProfile',
            email: 'test1@picpay.com',
            approved: true,
          },
          {
            githubProfile: 'test-githubProfile',
            email: 'test2@picpay.com',
            approved: true,
          },
        ],
        status: 'test-status',
        requestType: 'test-requestType',
        owner: 'test-owner',
        steps: [
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
        ],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
    };

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.getStatus('test-component-id');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should get Status By ID', async () => {
    const mockData = {
      has_next_page: true,
      limit: 1,
      error: false,
      message: 'test-message',
      data: {
        componet: {
          id: 'test-id',
          name: 'test-name',
        },
        requestedBy: 'test-requestedBy',
        reviewers: [
          {
            githubProfile: 'test-githubProfile',
            email: 'test1@picpay.com',
            approved: true,
          },
          {
            githubProfile: 'test-githubProfile',
            email: 'test2@picpay.com',
            approved: true,
          },
        ],
        status: 'test-status',
        requestType: 'test-requestType',
        owner: 'test-owner',
        steps: [
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
          {
            type: 'test-type',
            title: 'test-title',
            status: 'test-status',
            message: 'test-message',
            createdAt: '2024-01-01',
          },
        ],
        createdAt: '2024-01-01',
        updatedAt: '2024-01-02',
      },
    };

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.getStatusByID('test-status-id');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should create Action', async () => {
    const mockData = {
      componet: {
        id: 'test-id',
        name: 'test-name',
      },
      requestedBy: 'test-requestedBy',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test1@picpay.com',
          approved: true,
        },
        {
          githubProfile: 'test-githubProfile',
          email: 'test2@picpay.com',
          approved: true,
        },
      ],
      status: 'test-status',
      requestType: 'test-requestType',
      owner: 'test-owner',
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'test-status',
          message: 'test-message',
          createdAt: '2024-01-01',
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'test-status',
          message: 'test-message',
          createdAt: '2024-01-01',
        },
      ],
      createdAt: '2024-01-01',
      updatedAt: '2024-01-02',
    };

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.createAction({
      type: 'test-type',
      name: 'test-name',
      owner: 'test-owner',
      requestedBy: 1,
      reason: 'test-reason',
    });

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should patch Request', async () => {
    const mockData = {};

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.patchRequest('test-id', {
      scheduleReminderEnabled: true,
    });

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should retry Failure', async () => {
    const mockData = {};

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.retryFailure('test-id');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should review Approve', async () => {
    const mockData = {};

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.reviewApprove('test-id', 'test-email');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should review Reject', async () => {
    const mockData = {};

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.reviewReject('test-id', 'test-email');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
  it('Should delete', async () => {
    const mockData = {};

    const spy = jest.spyOn(client as any, 'fetch').mockResolvedValue(mockData);

    const result = await client.delete('test-id');

    expect(result).toEqual(mockData);
    spy.mockRestore();
  });
});
