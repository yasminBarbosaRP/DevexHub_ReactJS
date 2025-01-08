/**
 * PicPayGroupProvider.test.ts
 */
import { Logger } from 'winston';
import { Config } from '@backstage/config';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';
import { PicPayGroupProvider } from './PicPayGroupProvider';
import { PluginCacheManager, PluginDatabaseManager } from '@backstage/backend-common';
import { PicPayGroup } from './Record';
import fetchMock from 'jest-fetch-mock';

fetchMock.enableMocks();

let mockLogger: Logger;
let mockConfig: Config;
let mockConnection: EntityProviderConnection;
let mockCache: PluginCacheManager;

let listGroupsMock: jest.Mock;
let additionalRepoMock: { get: jest.Mock, getAll: jest.Mock };
let refreshRepoMock: { forceRefreshByLocationKey: jest.Mock };
let mockDb: any;

jest.mock('../database/Database', () => {
    return {
        Database: {
            create: jest.fn().mockImplementation(() => mockDb),
        },
    };
});

beforeEach(() => {

    listGroupsMock = jest.fn().mockResolvedValue([]);
    additionalRepoMock = {
        get: jest.fn().mockResolvedValue([]),
        getAll: jest.fn().mockResolvedValue([]),
    };
    refreshRepoMock = {
        forceRefreshByLocationKey: jest.fn().mockResolvedValue(undefined)
    }

    mockDb = {
        microsoftAD: () => ({
            listGroups: listGroupsMock,
        }),
        additionalInformationRepository: jest.fn(() => additionalRepoMock),
        members: () => ({ getAll: jest.fn().mockResolvedValue([]) }),
        refreshStateRepository: jest.fn(() => refreshRepoMock)
    };


    mockLogger = {
        info: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn(),
        child: jest.fn()
    } as unknown as Logger;

    (mockLogger.child as jest.Mock).mockReturnValue(mockLogger);

    mockConfig = {
        getOptionalString: jest.fn(),
        getOptionalNumber: jest.fn(),
        getOptionalBoolean: jest.fn(),
        getString: jest.fn(),
        getBoolean: jest.fn(),
        getNumber: jest.fn(),
        getOptionalConfig: jest.fn(),
        getOptionalConfigArray: jest.fn(),
        has: jest.fn(),
    } as unknown as Config;


    const mockCacheClientGet = jest.fn().mockResolvedValue(undefined);
    const mockCacheClientSet = jest.fn().mockResolvedValue(undefined);
    mockCache = {
        getClient: jest.fn().mockReturnValue({
            get: mockCacheClientGet,
            set: mockCacheClientSet,
        }),
    } as unknown as PluginCacheManager;


    mockConnection = {
        applyMutation: jest.fn(),
        refresh: jest.fn(),
    };


    jest.clearAllMocks();
    jest.resetModules();
    fetchMock.resetMocks();
});

/** 
 * 4) Write the actual tests 
 */
describe('PicPayGroupProvider', () => {
    describe('create', () => {
        it('should create an instance without error', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            expect(provider).toBeInstanceOf(PicPayGroupProvider);
        });
    });

    describe('connect', () => {
        it('should set connection and skip scheduling if manual', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.connect(mockConnection);

            expect((provider as any).connection).toBe(mockConnection);
            expect((provider as any).scheduleFn).toBeUndefined();
            expect(mockLogger.info).toHaveBeenCalledWith('Connecting to picpay-group-provider');
        });
    });

    describe('run', () => {
        it('should log error if no connection is set', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.run();
            expect(mockLogger.error).toHaveBeenCalledWith('No connection provided');
        });

        it('should handle empty listGroups', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.connect(mockConnection);


            await provider.run();
            expect(mockConnection.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [],
            });
        });

        it('should handle multiple pages of groups', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.connect(mockConnection);


            listGroupsMock
                .mockResolvedValueOnce([
                    { email: 'groupA@picpay.com', name: 'Group A' } as PicPayGroup,
                    { email: 'groupB@picpay.com', name: 'Group B' } as PicPayGroup,
                ])

                .mockResolvedValueOnce([
                    { email: 'groupC@picpay.com', name: 'Group C' } as PicPayGroup,
                ])

                .mockResolvedValueOnce([]);

            await provider.run();
            const { entities } = (mockConnection.applyMutation as jest.Mock).mock.calls[0][0];
            expect(entities.length).toBe(3);
            expect(mockLogger.info).toHaveBeenCalledWith('processing 2 groups');
            expect(mockLogger.info).toHaveBeenCalledWith('processing 1 groups');
            expect(mockLogger.info).toHaveBeenCalledWith('groups pagination ended');
        });

        it('should check if parent is coming from additionalInformation not pure lead ref', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.connect(mockConnection);


            listGroupsMock.mockResolvedValueOnce([
                { email: 'unnamed-lead@picpay.com', name: 'Group Unnamed', parent_email: 'cleber-mendes@picpay.com' } as PicPayGroup,
            ]);


            (mockConfig.getOptionalBoolean as jest.Mock).mockReturnValue(true);
            (mockConfig.getOptionalString as jest.Mock).mockReturnValue('http://mock-backend');


            additionalRepoMock.getAll.mockResolvedValueOnce([
                {
                    id: 'testing',
                    entityRef: 'group:picpay/cleber-mendes',
                    content: {
                        metadata: {
                            name: 'squad-atlantis',
                            annotations: {
                                'moonlight.picpay/unnamed-group': 'true',
                            },
                        },
                    },
                },
            ]);

            additionalRepoMock.get.mockResolvedValueOnce([
                {
                    id: 'testing',
                    content: {
                        metadata: {
                            annotations: {
                                'moonlight.picpay/unnamed-group': 'true',
                            },
                        },
                    },
                },
            ]);

            await provider.run();

            const { entities } = (mockConnection.applyMutation as jest.Mock).mock.calls[0][0];
            expect(entities.length).toBe(1);
            expect(entities[0].entity.spec?.parent).toBe('group:picpay/squad-atlantis');
        });

        it('should notify leads if config is true and group is unnamed', async () => {
            const dbManager = {} as PluginDatabaseManager;
            const provider = await PicPayGroupProvider.create(
                mockLogger,
                mockConfig,
                dbManager,
                dbManager,
                mockCache,
                'manual',
            );
            await provider.connect(mockConnection);


            listGroupsMock.mockResolvedValueOnce([
                { email: 'unnamed-lead@picpay.com', name: 'Group Unnamed' } as PicPayGroup,
            ]);


            (mockConfig.getOptionalBoolean as jest.Mock).mockReturnValue(true);
            (mockConfig.getOptionalString as jest.Mock).mockReturnValue('http://mock-backend');


            additionalRepoMock.get.mockResolvedValueOnce([
                {
                    id: 'testing',
                    content: {
                        metadata: {
                            annotations: {
                                'moonlight.picpay/unnamed-group': 'true',
                            },
                        },
                    },
                },
            ]);

            await provider.run();

            const { entities } = (mockConnection.applyMutation as jest.Mock).mock.calls[0][0];
            expect(entities.length).toBe(1);


            expect(fetchMock).toHaveBeenCalledTimes(1);
            expect(fetchMock.mock.calls[0][0]).toBe('http://mock-backend/api/slack/notify');
        });
    });

});
