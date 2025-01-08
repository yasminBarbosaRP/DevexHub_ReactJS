import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { Sanctuary2ApiClient } from './api';
import { ProgressStatus, StepStatus, ReviewerStatus } from './models';

describe('Sanctuary2ApiClient', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let client: Sanctuary2ApiClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('/api/sanctuary2/'),
    } as unknown as ConfigApi;
    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;
    client = new Sanctuary2ApiClient({ configApi, identityApi });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Should post Delete', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'postDelete').mockResolvedValue(mockResponse);

    const response = await client.postDelete({
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      reason: 'test-reason',
    });

    expect(response).toEqual(mockResponse);
  });
  it('Should post Approver', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'postApprover').mockResolvedValue(mockResponse);

    const response = await client.postApprover({
      component_id: 'test-component_id',
      reviewer: 'test-reviewer',
      review_status: 'test-review_status' as ReviewerStatus,
    });

    expect(response).toEqual(mockResponse);
  });
  it('Should post Retry', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'postRetry').mockResolvedValue(mockResponse);

    const response = await client.postRetry('test-id');

    expect(response).toEqual(mockResponse);
  });
  it('Should patch', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'patch').mockResolvedValue(mockResponse);

    const response = await client.patch('test-id', {
      component: {
        id: 'test-id',
        name: 'test-name',
      },
      requestedBy: 'test-requested_by',
      owner: 'test-owner',
      reason: 'test-reason',
      operation: 'delete',
      deletionSchedule: '2024-01-01',
      scheduleReminderEnabled: true,
    });

    expect(response).toEqual(mockResponse);
  });
  it('Should deleteRequest', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'deleteRequest').mockResolvedValue(mockResponse);

    const response = await client.deleteRequest('test-id');

    expect(response).toEqual(mockResponse);
  });
  it('Should getStatus', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'getStatus').mockResolvedValue(mockResponse);

    const response = await client.getStatus('test-appName', 'test-kind');

    expect(response).toEqual(mockResponse);
  });
  it('Should getStatusByID', async () => {
    const mockResponse = {
      id: 'test-id',
      component: {
        id: 'test-id',
        name: 'test-name',
        kind: 'Component',
      },
      requestedBy: 'test-requested_by',
      reviewers: [
        {
          githubProfile: 'test-githubProfile',
          email: 'test@picpay.com',
          status: 'test-status',
        },
        {
          githubProfile: 'test-githubProfile2',
          email: 'test-2@picpay.com',
          status: 'test-status',
        },
      ],
      resion: 'test-reason',
      status: 'approved' as ProgressStatus,
      steps: [
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
        {
          type: 'test-type',
          title: 'test-title',
          status: 'done' as StepStatus,
          events: [
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
            {
              type: 'test-type',
              message: 'test-message',
              date: '2024-01-01',
            },
          ],
        },
      ],
      updatedAt: '2024-01-01',
      createdAt: '2024-01-01',
    };

    jest.spyOn(client, 'getStatusByID').mockResolvedValue(mockResponse);

    const response = await client.getStatusByID('test-id');

    expect(response).toEqual(mockResponse);
  });
});
