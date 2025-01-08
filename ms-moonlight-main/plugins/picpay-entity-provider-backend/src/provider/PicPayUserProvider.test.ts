import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { PluginDatabaseManager, PluginCacheManager } from '@backstage/backend-common';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import { PicPayUserProvider } from './PicPayUserProvider';
import { PicPayUser } from './Record';
import { Members } from '../database/tables';
import { EntityRef } from './Record';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

const getAllAIMock = jest.fn();
const getAllMembersMock = jest.fn();
const getAIMock = jest.fn();
const listUsersMock = jest.fn();
const listGroupsMock = jest.fn();
const listTeamsMock = jest.fn();
const listMembersInOrgMock = jest.fn();
const requestMock = jest.fn();
const forceRefreshByLocationKeyMock = jest.fn();

jest.mock('../database/Database', () => {
  const dbMock = {
    create: jest.fn().mockResolvedValue({
      additionalInformationRepository: () => ({
        getAll: getAllAIMock,
        get: getAIMock,
      }),
      members: () => ({
        getAll: getAllMembersMock,
      }),
      microsoftAD: () => ({
        listUsers: listUsersMock,
        listGroups: listGroupsMock,
      }),
      refreshStateRepository: () => ({
        forceRefreshByLocationKey: forceRefreshByLocationKeyMock,
      })
    }),
  };
  return { Database: dbMock };
});

jest.mock('p-limit', () => jest.fn(() => (fn: any) => fn()));

const mockOctokit = {
  request: requestMock,
  rest: {
    teams: {
      list: listTeamsMock,
      listMembersInOrg: listMembersInOrgMock,
    },
    repos: {
      getContent: jest.fn(),
      listCommits: jest.fn(),
    },
  },
};
jest.mock('octokit', () => ({
  Octokit: class {
    constructor() {
      return mockOctokit;
    }
  },
}));

const mockCacheGet = jest.fn();
const mockCacheSet = jest.fn();
const mockCache = {
  getClient: jest.fn().mockReturnValue({
    get: mockCacheGet,
    set: mockCacheSet,
  }),
} as unknown as PluginCacheManager;

const mockLogger: Logger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn()
} as unknown as Logger;

const mockConfig: Config = {
  getOptionalString: jest.fn(),
  getString: jest.fn(),
  getOptionalConfigArray: jest.fn(),
  getOptionalNumber: jest.fn(),
} as unknown as Config;

const mockGithubConnection = jest.fn();
const mockGithubRepositoryRunQuery = jest.fn();
const mockGithubRepositoryGetTeams = jest.fn();
const mockGithubRepositoryGetTeamMembers = jest.fn();

// jest.mock('@internal/plugin-picpay-core-components', () => ({
//   ...jest.requireActual('@internal/plugin-picpay-core-components'),
//   githubConnection: jest.fn(),
// }));

const mockConnection: EntityProviderConnection = {
  applyMutation: jest.fn(),
  refresh: jest.fn(),
};

function setupDefaultMocks() {
  mockGithubConnection.mockResolvedValue({});
  mockGithubRepositoryRunQuery.mockResolvedValue({
    data: {
      data: {
        organization: {
          membersWithRole: {
            nodes: [],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    },
  });
  mockGithubRepositoryGetTeams.mockResolvedValue([]);
  mockGithubRepositoryGetTeamMembers.mockResolvedValue([]);
  listTeamsMock.mockResolvedValue({ data: [] });
  requestMock.mockResolvedValue({
    data: {
      data: {
        organization: {
          membersWithRole: {
            nodes: [],
            pageInfo: { hasNextPage: false },
          },
        },
      },
    },
  });

  // By default return an empty array for listUsers so run() won't fail
  listUsersMock.mockResolvedValue([]);
  mockCacheGet.mockResolvedValue(undefined); // not blocked by default
}

describe('PicPayUserProvider - Extended Coverage', () => {
  beforeEach(() => {
    (mockLogger.child as jest.Mock).mockReturnValue(mockLogger);
    jest.clearAllMocks();
    jest.resetModules();

    getAllAIMock.mockReset();
    getAllMembersMock.mockReset();
    getAIMock.mockReset();
    listUsersMock.mockReset();
    listGroupsMock.mockReset();
    listTeamsMock.mockReset();
    listMembersInOrgMock.mockReset();
    mockCacheGet.mockReset();
    mockCacheSet.mockReset();
    requestMock.mockReset();
    (mockConfig.getOptionalString as jest.Mock).mockReturnValue(undefined);

    setupDefaultMocks();
  });

  it('should handle loadGithubUsersInformation with runQuery returning no nodes', async () => {
    // runQuery returns no nodes
    mockGithubRepositoryRunQuery.mockResolvedValueOnce({
      data: {
        data: {
          organization: {
            membersWithRole: { nodes: [], pageInfo: { hasNextPage: false } }
          }
        }
      }
    });
    listUsersMock.mockResolvedValue([]);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    await provider.connect(mockConnection);
    await provider.run();

    // no logs about users with no email
    expect(mockLogger.debug).not.toHaveBeenCalledWith(expect.stringContaining('User '));
  });

  it('should handle loadGithubUsersInformation where runQuery throws an error', async () => {
    // runQuery throws
    requestMock.mockRejectedValueOnce(new Error('GitHub API error'));
    listUsersMock.mockResolvedValue([]);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    await provider.connect(mockConnection);

    // runQuery rejects, so loadGithubUsersInformation rejects, run rejects too
    await expect(provider.run()).rejects.toThrow('GitHub API error');
  });

  it('should handle multiple AdditionalInformation merging in additionalInformation()', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    const entityRef = new EntityRef({ type: 'user', namespace: 'default', name: 'merged-user' });
    const entity = { metadata: { annotations: { base: 'annotation' } }, spec: { data: ['val1'] } };

    getAIMock.mockResolvedValueOnce([
      {
        id: 'ai1',
        content: {
          metadata: { annotations: { extra: 'annotation1' } },
          spec: { data: ['val2'], nested: { arr: ['nested1'] } }
        }
      },
      {
        id: 'ai2',
        content: {
          metadata: { annotations: { extra2: 'annotation2' } },
          spec: { data: ['val3'], nested: { arr: ['nested2'] } }
        }
      }
    ]);

    const results = await (provider as any).additionalInformation(entityRef, entity);

    expect(results.length).toBe(2);
    const r1 = results[0];
    const r2 = results[1];

    expect(r1.metadata.annotations.extra).toBe('annotation1');
    expect(r1.spec.data).toEqual(['val1', 'val2']);
    expect(r1.spec.nested.arr).toEqual(['nested1']);

    expect(r2.metadata.annotations.extra2).toBe('annotation2');
    expect(r2.spec.data).toEqual(['val1', 'val3']);
    expect(r2.spec.nested.arr).toEqual(['nested2']);
  });

  it('should handle additionalInformation with no additional info returned', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    getAIMock.mockResolvedValueOnce([]);
    const entityRef = new EntityRef({ type: 'user', namespace: 'default', name: 'no-info' });
    const entity = { metadata: {}, spec: {} };

    const results = await (provider as any).additionalInformation(entityRef, entity);
    expect(results.length).toBe(1);
    expect(results[0]).toEqual(entity);
  });

  it('should handle multiple AdditionalInformation entries in preloadAdditionalInformation()', async () => {
    listUsersMock.mockResolvedValue([]);
    getAllAIMock.mockResolvedValueOnce([
      { entityRef: 'user:default/foo', id: 'foo1', content: {} as any },
      { entityRef: 'user:default/foo', id: 'foo2', content: {} as any },
      { entityRef: 'group:default/bar', id: 'bar1', content: {} as any },
    ]);

    getAllMembersMock.mockResolvedValueOnce([
      { additionalInformationId: 'foo1', entityRef: 'user:default/fooMember' },
      { additionalInformationId: 'bar1', entityRef: 'user:default/barMember' },
    ]);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    await (provider as any).preloadAdditionalInformation();

    const additionalMap = (provider as any).additionalInformationMap;
    const membersMap = (provider as any).membersMap;
    expect(additionalMap.get('user:default/foo').length).toBe(2);
    expect(additionalMap.get('group:default/bar').length).toBe(1);

    expect(membersMap.get('foo1')[0].entityRef).toBe('user:default/fooMember');
    expect(membersMap.get('bar1')[0].entityRef).toBe('user:default/barMember');
  });

  it('should handle realEntityRef with multiple additional infos and a filter query', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual',
    );

    await (provider as any).preloadAdditionalInformation();
    (provider as any).additionalInformationMap.set('user:default/filterme', [
      { id: 'f1', content: { metadata: { name: 'filtered1' } } },
      { id: 'f2', content: { metadata: { name: 'filtered2' } } }
    ]);
    (provider as any).membersMap.set('f1', [{ entityRef: 'user:default/filterMember1' }]);
    (provider as any).membersMap.set('f2', [{ entityRef: 'user:default/filterMember2' }]);

    const entityRef = new EntityRef({ type: 'user', namespace: 'default', name: 'filterme' });
    const query = (members: Members[]) => members.some(m => m.entityRef.includes('filterMember2'));

    const result = await (provider as any).realEntityRef(entityRef, query);
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('filtered2');
  });

  it('should handle realEntityRef with invalid entityRef', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual',
    );

    // Invalid: empty name
    const invalidRef = new EntityRef({ type: 'user', namespace: 'default', name: '' });
    const result = await (provider as any).realEntityRef(invalidRef);
    expect(result).toBeUndefined();
  });

  it('should handle getGitHubUser when cache returns null', async () => {
    listUsersMock.mockResolvedValue([]);
    mockCacheGet.mockResolvedValue(null);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    const result = await (provider as any).getGitHubUser('malformed@example.com');
    expect(result).toBeUndefined();
  });

  it('should handle getSlackInformation when Slack returns partial data', async () => {
    (mockConfig.getOptionalString as jest.Mock).mockReturnValue('fake-slack-token');
    mockCacheGet.mockResolvedValue(undefined);

    const mockSlackApi = {
      users: {
        lookupByEmail: jest.fn().mockResolvedValue({ user: { id: undefined, profile: {} } }),
      },
    };

    jest.doMock('@slack/web-api', () => ({
      WebClient: jest.fn().mockImplementation(() => mockSlackApi),
    }));

    const { PicPayUserProvider: PartialSlackProvider } = await import('./PicPayUserProvider');
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;

    const provider = await PartialSlackProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    const result = await (provider as any).getSlackInformation('partial@example.com');
    expect(result).toEqual({ slackId: undefined, picture: undefined });
  });

  it('should handle getSlackInformation when Slack throws another error', async () => {
    (mockConfig.getOptionalString as jest.Mock).mockReturnValue('fake-slack-token');
    mockCacheGet.mockResolvedValue(undefined);

    const mockSlackApi = {
      users: {
        lookupByEmail: jest.fn().mockRejectedValue(new Error('Some other Slack error')),
      },
    };

    jest.doMock('@slack/web-api', () => ({
      WebClient: jest.fn().mockImplementation(() => mockSlackApi),
    }));

    const { PicPayUserProvider: SlackErrorProvider } = await import('./PicPayUserProvider');
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;

    const provider = await SlackErrorProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    const result = await (provider as any).getSlackInformation('othererror@example.com');

    expect(mockLogger.debug).toHaveBeenCalledWith('Error fetching user picture');
    expect(result).toBeUndefined();
  });

  it('should double-run loadGithubUsersInformation and find it blocked second time', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;

    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    await provider.connect(mockConnection);
    await provider.run();

    mockCacheGet.mockImplementation((key: string) => (key === 'github:blocked' ? true : undefined));
    await provider.run();

    expect(mockLogger.debug).toHaveBeenCalledWith('Github information already loaded');
  });

  it('should handle scenario of multiple pages of teams and members in loadGithubUsersInformation', async () => {
    // Ensure successful runQuery and connection
    (mockConfig.getOptionalString as jest.Mock).mockReturnValue('some-token');
    mockGithubConnection.mockResolvedValue({});
    requestMock.mockResolvedValue({
      data: {
        data: {
          organization: {
            membersWithRole: {
              nodes: [], // no org nodes, but it's fine, we just want to get to teams
              pageInfo: { hasNextPage: false },
            },
          },
        },
      },
    });

    listTeamsMock
      .mockResolvedValueOnce({ data: [{ slug: 'teamA' }] })
      .mockResolvedValueOnce({ data: [{ slug: 'teamB' }] })
      .mockResolvedValueOnce({ data: [] });

    // teamA members
    listMembersInOrgMock
      .mockResolvedValueOnce({ data: [{ login: 'teamAuser1' }] }) // page 1 teamA
      .mockResolvedValueOnce({ data: [] }) // no more teamA members
      // teamB members
      .mockResolvedValueOnce({ data: [{ login: 'teamBuser1' }, { login: 'teamBuser2' }] })
      .mockResolvedValueOnce({ data: [{ login: 'teamBuser3' }] })
      .mockResolvedValueOnce({ data: [] }); // no more teamB members

    listUsersMock.mockResolvedValue([]);
    mockCacheGet.mockResolvedValue(undefined);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    await provider.connect(mockConnection);

    await provider.run();

    // After teams and members fetched, we must have these logs
    expect(mockLogger.debug).toHaveBeenCalledWith('adding teamAuser1 team teamA to cache');
    expect(mockLogger.debug).toHaveBeenCalledWith('adding teamBuser1 team teamB to cache');
    expect(mockLogger.debug).toHaveBeenCalledWith('adding teamBuser2 team teamB to cache');
    expect(mockLogger.debug).toHaveBeenCalledWith('adding teamBuser3 team teamB to cache');
  });

  it('should test memberOf method with is_lead and filtering conditions', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    await (provider as any).preloadAdditionalInformation();
    (provider as any).additionalInformationMap.set('group:default/lead@company.com', [
      { id: 'leadInfo', content: {} }
    ]);
    (provider as any).membersMap.set('leadInfo', [
      { entityRef: 'user:default/leadUser' }, { entityRef: 'user:default/otherUser' }
    ]);

    const user: PicPayUser = {
      email: 'someone@example.com',
      name: 'Someone',
      job_name: 'Tester',
      active: true,
      is_lead: true,
      lead_email: 'lead@company.com',
    };

    const memberOf = await (provider as any).memberOf(user);
    expect(memberOf.length).toBeGreaterThan(0);
  });

  it('should handle scenario where getGitHubUser is called with no config and no cache', async () => {
    mockGithubConnection.mockResolvedValueOnce(undefined);
    mockCacheGet.mockResolvedValue(undefined);
    listUsersMock.mockResolvedValue([]);

    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    await provider.connect(mockConnection);

    await provider.run();

    const result = await (provider as any).getGitHubUser('noConfig@example.com');
    expect(result).toBeUndefined();
  });

  it('should handle scenario where additionalInformation merges arrays multiple times', async () => {
    listUsersMock.mockResolvedValue([]);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );

    const entityRef = new EntityRef({ type: 'user', namespace: 'default', name: 'multi-arrays' });
    const entity = { metadata: {}, spec: { arr: [1], obj: { arr2: ['base'] } } };
    getAIMock.mockResolvedValueOnce([
      { id: 'ai-complex', content: { spec: { arr: [2, 3], obj: { arr2: ['added'] } } } }
    ]);

    const results = await (provider as any).additionalInformation(entityRef, entity);
    expect(results[0].spec.arr).toEqual([1, 2, 3]);
    expect(results[0].spec.obj.arr2).toEqual(['base', 'added']);
  });

  it('should do nothing if leadRef is empty', async () => {
    // user.lead_email is empty => leadRef becomes empty => function returns early
    const user = {
      email: 'someone@org.com',
      lead_email: '',
      name: 'User Name',
    } as PicPayUser;
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    await (provider as any).notifyUserOutOfGroups(user, 'user:default/someone', [], mockCache.getClient());
    expect(fetchMock).not.toHaveBeenCalled();
    expect(mockCacheGet).not.toHaveBeenCalled();
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should skip notifying if cacheKey is already set', async () => {
    // Emulate that this leadRef was already notified (skip)
    mockCacheGet.mockResolvedValueOnce({ notified: true });
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    const user = {
      email: 'someone@org.com',
      lead_email: 'lead@org.com',
      name: 'User Name',
    } as PicPayUser;

    await (provider as any).notifyUserOutOfGroups(user, 'user:default/someone', [], mockCache.getClient());
    expect(fetchMock).not.toHaveBeenCalled();
    // we tried to read from cache
    expect(mockCacheGet).toHaveBeenCalledWith(
      'picpay-user-provider:outofgroup-reminder:user:org/lead',
    );
    expect(mockLogger.error).not.toHaveBeenCalled();
  });

  it('should call Slack API if not cached, sets cache after success', async () => {
    // There is no entry in cache => proceed
    mockCacheGet.mockResolvedValueOnce(undefined);
    fetchMock.mockResolvedValue({ ok: true } as Response);
    const databaseManager = {
      getClient: jest.fn().mockResolvedValue({})
    } as PluginDatabaseManager;
    (mockConfig.getString as jest.Mock).mockReturnValueOnce('http://localhost:7001');
    const provider = await PicPayUserProvider.create(
      mockLogger, mockConfig, databaseManager, databaseManager, mockCache, 'manual'
    );
    const user = {
      email: 'someone@org.com',
      lead_email: 'lead@org.com',
      name: 'User Name',
    } as PicPayUser;

    // Provide some "leadGroups" as well
    const leadGroups = [
      new EntityRef({ name: 'group-1', namespace: 'default', type: 'group' }),
    ];

    await (provider as any).notifyUserOutOfGroups(
      user,
      'user:default/someone',
      leadGroups,
      mockCache.getClient(),
    );

    // Should have posted to Slack
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:7001/api/slack/notify',
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      }),
    );

    // Check request body
    const bodyArg = JSON.parse((fetchMock.mock.calls[0][1] as RequestInit).body as string);
    expect(bodyArg.email).toBe('lead@org.com');
    // "buttons" should be generated from the leadGroups array
    expect(bodyArg.buttons).toEqual([
      expect.objectContaining({
        text: 'group-1',
        value: expect.any(String),
      }),
    ]);

    // And we set the cache after success
    expect(mockCacheSet).toHaveBeenCalledWith(
      'picpay-user-provider:outofgroup-reminder:user:org/lead',
      { notified: true },
      expect.objectContaining({ ttl: expect.any(Number) }), // 60 * 60 * 24 * (days)
    );
  });
});
