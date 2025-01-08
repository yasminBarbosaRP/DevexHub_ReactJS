import { getVoidLogger } from '@backstage/backend-common';
import { CustomEntityErrorProcessor } from './CustomEntityErrorProcessor';
import { CatalogApi } from '@backstage/catalog-client';
import { Config } from '@backstage/config';
import { PluginTaskScheduler } from '@backstage/backend-tasks';


const mockCounter = {
    add: jest.fn()
}
const mockHistogram = {
    record: jest.fn()
}

jest.mock('@opentelemetry/api', () => ({
    metrics: {
        getMeter: () => ({
            createCounter: () => mockCounter,
            createHistogram: () => mockHistogram
        })
    }
}));

describe('CustomEntityErrorProcessor', () => {
    beforeEach(() => {
        jest.resetAllMocks();
    });

    let processor: CustomEntityErrorProcessor;
    let logger: any;
    const mockConfig = {
        getOptionalString: jest.fn().mockReturnValue('user:default/user.test'),
        getString: jest.fn().mockReturnValue('http://moonlight.limbo.work'),
    } as unknown as Config;
    const mockScheduler: PluginTaskScheduler = {
        createScheduledTaskRunner: jest.fn().mockReturnValue({
            run: jest.fn(), // Add this line
        }),
    } as any;
    const mockCatalogApi: jest.Mocked<CatalogApi> = {
        getLocationById: jest.fn(),
        getEntityByName: jest.fn(),
        getEntities: jest.fn(async () => ({ items: [] })),
        addLocation: jest.fn(),
        getLocationByRef: jest.fn(),
        removeEntityByUid: jest.fn(),
    } as any;

    beforeEach(() => {
        jest.resetAllMocks();
        logger = getVoidLogger();
        processor = new CustomEntityErrorProcessor(logger, mockConfig, mockScheduler, mockCatalogApi);
    });

    it('should create an issue when processing error occurs', async () => {
        // Arrange
        process.env.ISSUES_FOR_ENTITY_WITH_ERROR = 'true';
        const mockGetOrganizationAndRepository = jest.spyOn(processor as any, 'getOrganizationAndRepository').mockReturnValue(['PicPay', 'test-repo']);
        const mockCreateOrUpdateIssue = jest.spyOn(processor as any, 'createOrUpdateIssue').mockImplementation(() => Promise.resolve());

        const error = new Error('Test error');
        const entity = {
            metadata: {
                name: 'test-entity',
                annotations: {
                    'backstage.io/source-location': 'https://github.com/PicPay/test-repo/tree/main/catalog-info.yaml',
                },
            },
            kind: 'Service',
        };

        // Act
        processor.onProcessingError({ unprocessedEntity: entity as any, errors: [error] });

        // Assert
        expect(mockGetOrganizationAndRepository).toHaveBeenCalledWith(entity.metadata.annotations);
        expect(mockCreateOrUpdateIssue).toHaveBeenCalledWith(
            'PicPay',
            'test-entity',
            'test-repo',
            expect.any(String),
            expect.any(String),
            expect.any(Array)
        );
    });

    it('should not create an issue when ISSUES_FOR_ENTITY_WITH_ERROR is not set', () => {
        // Arrange
        delete process.env.ISSUES_FOR_ENTITY_WITH_ERROR;
        const mockCreateOrUpdateIssue = jest.spyOn(processor as any, 'createOrUpdateIssue');
        const error = new Error('Test error');
        const entity = {
            metadata: {
                name: 'test-entity',
            },
            kind: 'Service',
        };

        // Act
        processor.onProcessingError({ unprocessedEntity: entity as any, errors: [error] });

        // Assert
        expect(mockCreateOrUpdateIssue).not.toHaveBeenCalled();
    });

    it('should extract organization and repository from annotations', () => {
        // Arrange
        const annotations = {
            'backstage.io/source-location': 'https://github.com/PicPay/test-repo/tree/main/catalog-info.yaml',
        };

        // Act
        const [org, repo] = (processor as any).getOrganizationAndRepository(annotations);

        // Assert
        expect(org).toBe('PicPay');
        expect(repo).toBe('test-repo');
    });

    it('should not create an issue for User and Group entities', () => {
        // Arrange
        process.env.ISSUES_FOR_ENTITY_WITH_ERROR = 'true';
        const mockCreateOrUpdateIssue = jest.spyOn(processor as any, 'createOrUpdateIssue');
        const error = new Error('Test error');
        const entity = {
            metadata: {
                name: 'user-entity',
            },
            kind: 'User',
        };

        // Act
        processor.onProcessingError({ unprocessedEntity: entity as any, errors: [error] });

        // Assert
        expect(mockCreateOrUpdateIssue).not.toHaveBeenCalled();
    });

    it('should ignore errors when shouldIgnoreError returns true', () => {
        // Arrange
        process.env.ISSUES_FOR_ENTITY_WITH_ERROR = 'true';
        const mockCreateOrUpdateIssue = jest.spyOn(processor as any, 'createOrUpdateIssue');
        jest.spyOn(processor as any, 'shouldIgnoreError').mockReturnValue(true);
        const error = new Error('Test error');
        const entity = {
            metadata: {
                name: 'test-entity',
            },
            kind: 'Service',
        };

        // Act
        processor.onProcessingError({ unprocessedEntity: entity as any, errors: [error] });

        // Assert
        expect(mockCreateOrUpdateIssue).not.toHaveBeenCalled();
    });

    it('should extract categories from error messages', () => {
        // Arrange
        const errors = [
            'PlaceholderProcessor: could not be read',
            'Some other error',
            'Field must be a string',
        ];

        // Act
        const categories = (processor as any).getCategories(errors);

        // Assert
        expect(categories).toContain('moonlight-catalog:invalid-reference');
        expect(categories).toContain('moonlight-catalog:invalid-field-value');
    });

    it('should set up cleaner when ISSUES_CLEANER_FOR_INVALID_CATALOG is set', async () => {
        // Arrange
        process.env.ISSUES_CLEANER_FOR_INVALID_CATALOG = 'true';
        const mockTaskRunner = {
            run: jest.fn(),
        };
        (mockScheduler.createScheduledTaskRunner as jest.Mock).mockReturnValue(mockTaskRunner);

        // Act
        await processor.setupCleaner();

        // Assert
        expect(mockScheduler.createScheduledTaskRunner).toHaveBeenCalled();
        expect(mockTaskRunner.run).toHaveBeenCalled();
    });

    it('should not set up cleaner when ISSUES_CLEANER_FOR_INVALID_CATALOG is not set', async () => {
        // Arrange
        delete process.env.ISSUES_CLEANER_FOR_INVALID_CATALOG;
        const mockTaskRunner = {
            run: jest.fn(),
        };
        (mockScheduler.createScheduledTaskRunner as jest.Mock).mockReturnValue(mockTaskRunner);

        // Act
        await processor.setupCleaner();

        // Assert
        expect(mockScheduler.createScheduledTaskRunner).not.toHaveBeenCalled();
        expect(mockTaskRunner.run).not.toHaveBeenCalled();
    });

    describe('OpenTelemetry metrics', () => {
        it('should record metrics when issues are closed successfully', async () => {
            // Arrange
            process.env.ISSUES_CLEANER_FOR_INVALID_CATALOG = 'true';
            const mockTaskRunner = { run: jest.fn() };
            (mockScheduler.createScheduledTaskRunner as jest.Mock).mockReturnValue(mockTaskRunner);

            const mockOctokit = {
                rest: {
                    search: {
                        issuesAndPullRequests: jest.fn().mockResolvedValue({
                            data: {
                                items: [{
                                    repository_url: 'https://github.com/PicPay/test-repo',
                                    body: 'backstage.io/managed-by-location":"http://test-location"',
                                    html_url: 'test-url',
                                    number: 1
                                }]
                            }
                        }),
                    },
                    issues: {
                        update: jest.fn().mockResolvedValue({ data: { html_url: 'test-url' } }),
                    },
                },
            };
            global.fetch = jest.fn().mockResolvedValue({ ok: true });
            jest.spyOn(processor as any, 'getClientOctokit').mockResolvedValue(mockOctokit);

            // Act
            await processor.setupCleaner();
            const cleanerFn = mockTaskRunner.run.mock.calls[0][0].fn;
            await cleanerFn();

            // Assert
            expect(mockCounter.add).toHaveBeenCalledWith(expect.any(Number), { result: 'success' });
            expect(mockHistogram.record).toHaveBeenCalledWith(expect.any(Number), { result: 'success' });
        });

        it('should record metrics for not cataloged repositories processing', async () => {
            // Arrange
            process.env.ISSUES_FOR_NOT_CATALOGED_REPOS = 'true';
            const mockTaskRunner = { run: jest.fn() };
            (mockScheduler.createScheduledTaskRunner as jest.Mock).mockReturnValue(mockTaskRunner);
            mockCatalogApi.getEntities = jest.fn().mockResolvedValueOnce({
                items: []
            });

            const listForOrg = jest.fn().mockResolvedValueOnce({
                data: [{
                    name: 'test-repo',
                    owner: { login: 'PicPay' },
                    visibility: 'private',
                    archived: false
                }]
            })
            const mockOctokit = {
                rest: {
                    repos: {
                        listForOrg
                    },
                    issues: {
                        listForRepo: jest.fn().mockResolvedValueOnce({ data: [] }),
                        create: jest.fn().mockResolvedValueOnce({ data: { html_url: 'test-url' } }),
                    },
                },
            };
            listForOrg.mockResolvedValueOnce({ data: [] });
            jest.spyOn(processor as any, 'getClientOctokit').mockResolvedValue(mockOctokit);

            // Act
            await processor.setupNotCatalogedRepos();
            const notifierFn = mockTaskRunner.run.mock.calls[0][0].fn;
            await notifierFn();

            // Assert
            expect(mockCounter.add).toHaveBeenCalledWith(1, { result: 'success' });
            expect(mockHistogram.record).toHaveBeenCalledWith(expect.any(Number), { result: 'success' });
        });

        it('should record error metrics when processing fails', async () => {
            // Arrange
            process.env.ISSUES_CLEANER_FOR_INVALID_CATALOG = 'true';
            const mockTaskRunner = { run: jest.fn() };
            (mockScheduler.createScheduledTaskRunner as jest.Mock).mockReturnValue(mockTaskRunner);
            jest.spyOn(processor as any, 'getClientOctokit').mockRejectedValue(new Error('Test error'));

            // Act
            await processor.setupCleaner();
            const cleanerFn = mockTaskRunner.run.mock.calls[0][0].fn;
            await cleanerFn();

            // Assert
            expect(mockHistogram.record).toHaveBeenCalledWith(expect.any(Number), { result: 'error' });
        });
    });
});