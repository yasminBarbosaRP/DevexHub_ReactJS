// GithubWebhooksProvider.test.ts

import { GithubWebhooksProvider } from './GithubWebhooksProvider';
import { CatalogClient } from '@backstage/catalog-client';
import { Logger } from 'winston';
import { ScmIntegrations } from '@backstage/integration';
import { GithubCredentialsProvider } from '@backstage/integration';
import { ConfigReader } from '@backstage/config';
import { EntityProviderConnection } from '@backstage/plugin-catalog-node';

const octokit = {
    request: jest.fn(),
    rest: {
        repos: {
            listWebhooks: jest.fn(),
            createWebhook: jest.fn(),
            deleteWebhook: jest.fn(),
            listForOrg: jest.fn(),
        }
    },
    paginate: async (fn: any) => (await fn()).data,
    apps: {
        listInstallations: jest.fn(),
        listReposAccessibleToInstallation: jest.fn(),
        createInstallationAccessToken: jest.fn(),
    },
};

jest.mock('@octokit/rest', () => {
    class Octokit {
        constructor() {
            return octokit;
        }
    }
    return { Octokit };
});

describe('GithubWebhooksProvider', () => {
    let provider: GithubWebhooksProvider;
    let mockLogger: jest.Mocked<Logger>;
    let mockCatalog: jest.Mocked<CatalogClient>;
    let mockScmIntegrations: ScmIntegrations;
    let mockCredentialsProvider: jest.Mocked<GithubCredentialsProvider>;

    beforeEach(async () => {
        mockLogger = {
            info: jest.fn(),
            error: jest.fn(),
            debug: jest.fn(),
            child: jest.fn().mockReturnThis(),
        } as any;

        mockCatalog = {
            getEntities: jest.fn(),
        } as any;

        mockScmIntegrations = ScmIntegrations.fromConfig(
            new ConfigReader({
                integrations: {
                    github: [
                        {
                            host: 'github.com',
                            apiBaseUrl: 'https://api.github.com',
                        }
                    ],
                },
            }),
        )

        mockCredentialsProvider = {
            getCredentials: jest.fn(),
        } as any;

        provider = await GithubWebhooksProvider.create(
            mockLogger,
            mockScmIntegrations,
            mockCredentialsProvider,
            60,
            mockCatalog,
            'manual'
        );
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('getProviderName', () => {
        it('should return the correct provider name', () => {
            expect(provider.getProviderName()).toBe('github-webhook-provider');
        });
    });

    describe('connect', () => {
        it('should establish a connection and log the action', async () => {
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            await provider.connect(connectorMock);
            expect(mockLogger.info).toHaveBeenCalledWith('Connecting to github-webhook-provider');
        });
    });

    describe('run', () => {
        it('should execute the run method and log the start', async () => {
            await provider.run();
            expect(mockLogger.info).toHaveBeenCalledWith('Running github-webhook-provider');
        });

        it('should handle run errors gracefully', async () => {
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            };
            await provider.connect(connectorMock);
            mockCatalog.getEntities.mockRejectedValueOnce(new Error('Run failed'));

            await expect(provider.run()).rejects.toThrow('Run failed');
        });
    });

    describe('run auditlogs with previous webhooks', () => {
        it('should apply full with prev webhook without relations', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
        });
        it('should apply full with prev webhook without relations that arent from github', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://gitlab.com/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'created',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('should apply full with prev webhook and relations', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'created',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                                dependencyOf: [
                                    'component:default/ms-moonlight',
                                ],
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('should apply full with prev webhook and relations paginated auditlogs', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                    {
                        metadata: {
                            name: 'ms-katchau',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'created',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {
                    link: '<https://api.github.com/orgs/example-org/audit-log?per_page=100&page=2>; rel="next", <https://api.github.com/orgs/example-org/audit-log?per_page=100&page=1>; rel="first", <https://api.github.com/orgs/example-org/audit-log?per_page=100&page=10>; rel="last"',
                },
            })
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'created',
                        id: 1,
                        repo: 'PicPay/ms-katchau',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(2);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                                dependencyOf: [
                                    'component:default/ms-moonlight',
                                    'component:default/ms-katchau',
                                ],
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('should apply full with prev webhook, hook.destroy but auditlog without webhook url', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                            dependencyOf: ["component:default/ms-moonlight"]
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'hook.destroy',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {},
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                                dependencyOf: ["component:default/ms-moonlight"],
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('should apply full without relations due webhook removed from repository', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                            dependencyOf: ["component:default/ms-moonlight"]
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'hook.destroy',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.request).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                                dependencyOf: [],
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('should apply full with prev webhook and relations and one rate-limit', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockRejectedValueOnce({
                status: 403,
            })
            octokit.request.mockResolvedValueOnce({
                data: [
                    {
                        action: 'created',
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(mockLogger.debug).toHaveBeenCalledWith('Token expired or rate limit reached, refreshing')
            expect(octokit.request).toHaveBeenCalledTimes(2);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'test',
                                namespace: 'default',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                lifecycle: 'experimental',
                                owner: 'test',
                                dependencyOf: [
                                    'component:default/ms-moonlight',
                                ],
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });
        it('failed on request call', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'test',
                            namespace: 'default',
                            annotations: {
                                'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                            }
                        },
                        spec: {
                            type: 'webhook',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Resource'
                    },
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight',
                            }
                        },
                        spec: {
                            type: 'service',
                            lifecycle: 'experimental',
                            owner: 'test',
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component'
                    },
                ],
            });
            octokit.request.mockRejectedValueOnce({
                status: 404,
                message: "Not Found",
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await expect(provider.run()).rejects.toEqual({"message": "Not Found", "status": 404})
        });
    });


    describe('run All', () => {
        it('should apply full without relations', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [],
            });
            // page 1
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [
                    {
                        name: 'ms-moonlight',
                        full_name: 'PicPay/ms-moonlight',
                    },
                ],
                headers: {},
            })
            // page 2
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [],
                headers: {},
            })

            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [
                    {
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledTimes(2);
            expect(octokit.rest.repos.listForOrg).toHaveBeenCalledTimes(2);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'webhook-a976b9a34557d4761da390efcb95f68a',
                                namespace: 'default',
                                description: 'Webhook for http://localhost:7000/webhook',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                    'backstage.io/managed-by-location': 'picpay://github-webhook-provider',
                                    'backstage.io/managed-by-origin-location': 'picpay://github-webhook-provider',
                                    'backstage.io/source-location': 'picpay://github-webhook-provider',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                dependencyOf: [],
                                lifecycle: 'production',
                                owner: 'unknown',
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });

        it('should apply full with relations', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://github.com/PicPay/ms-moonlight/tree/main/catalog-info.yaml',
                            }
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component',
                        spec: {
                            type: 'service'
                        }
                    }
                ],
            });
            // page 1
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [
                    {
                        name: 'ms-moonlight',
                        full_name: 'PicPay/ms-moonlight',
                    },
                ],
                headers: {},
            })
            // page 2
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [],
                headers: {},
            })

            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [
                    {
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledTimes(2);
            expect(octokit.rest.repos.listForOrg).toHaveBeenCalledTimes(2);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'webhook-a976b9a34557d4761da390efcb95f68a',
                                namespace: 'default',
                                description: 'Webhook for http://localhost:7000/webhook',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                    'backstage.io/managed-by-location': 'picpay://github-webhook-provider',
                                    'backstage.io/managed-by-origin-location': 'picpay://github-webhook-provider',
                                    'backstage.io/source-location': 'picpay://github-webhook-provider',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                dependencyOf: ["component:default/ms-moonlight"],
                                lifecycle: 'production',
                                owner: 'unknown',
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });

        it('should apply full without relations - non github entities', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [
                    {
                        metadata: {
                            name: 'ms-moonlight',
                            namespace: 'default',
                            annotations: {
                                'backstage.io/source-location': 'url:https://gitlab.com/ms-moonlight/tree/main/catalog-info.yaml',
                            }
                        },
                        apiVersion: 'backstage.io/v1alpha1',
                        kind: 'Component',
                        spec: {
                            type: 'service'
                        }
                    }
                ],
            });
            // page 1
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [
                    {
                        name: 'ms-moonlight',
                        full_name: 'PicPay/ms-moonlight',
                    },
                ],
                headers: {},
            })
            // page 2
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [],
                headers: {},
            })

            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [
                    {
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledTimes(2);
            expect(octokit.rest.repos.listForOrg).toHaveBeenCalledTimes(2);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'webhook-a976b9a34557d4761da390efcb95f68a',
                                namespace: 'default',
                                description: 'Webhook for http://localhost:7000/webhook',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                    'backstage.io/managed-by-location': 'picpay://github-webhook-provider',
                                    'backstage.io/managed-by-origin-location': 'picpay://github-webhook-provider',
                                    'backstage.io/source-location': 'picpay://github-webhook-provider',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                dependencyOf: [],
                                lifecycle: 'production',
                                owner: 'unknown',
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });

        it('should apply full without relations rate limit reached', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [],
            });
            // page 1
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [
                    {
                        name: 'ms-moonlight',
                        full_name: 'PicPay/ms-moonlight',
                    },
                ],
                headers: {},
            })
            // rate limit
            octokit.rest.repos.listForOrg.mockRejectedValueOnce({
                status: 403,
            })
            // page 2
            octokit.rest.repos.listForOrg.mockResolvedValueOnce({
                data: [],
                headers: {},
            })

            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [
                    {
                        id: 1,
                        repo: 'PicPay/ms-moonlight',
                        config: {
                            url: 'http://localhost:7000/webhook',
                        },
                    },
                ],
                headers: {},
            })
            octokit.rest.repos.listWebhooks.mockResolvedValueOnce({
                data: [],
                headers: {},
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await provider.run();
            expect(mockLogger.debug).toHaveBeenCalledWith('Token expired or rate limit reached, refreshing')
            expect(mockCredentialsProvider.getCredentials).toHaveBeenCalledTimes(3)
            expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledTimes(2);
            expect(octokit.rest.repos.listForOrg).toHaveBeenCalledTimes(3);
            expect(connectorMock.applyMutation).toHaveBeenCalledTimes(1);
            expect(connectorMock.applyMutation).toHaveBeenCalledWith({
                type: 'full',
                entities: [
                    {
                        locationKey: 'github-webhook-provider',
                        entity: {
                            metadata: {
                                name: 'webhook-a976b9a34557d4761da390efcb95f68a',
                                namespace: 'default',
                                description: 'Webhook for http://localhost:7000/webhook',
                                annotations: {
                                    'moonlight.picpay/webhook-url': 'http://localhost:7000/webhook',
                                    'backstage.io/managed-by-location': 'picpay://github-webhook-provider',
                                    'backstage.io/managed-by-origin-location': 'picpay://github-webhook-provider',
                                    'backstage.io/source-location': 'picpay://github-webhook-provider',
                                }
                            },
                            spec: {
                                type: 'webhook',
                                dependencyOf: [],
                                lifecycle: 'production',
                                owner: 'unknown',
                            },
                            apiVersion: 'backstage.io/v1alpha1',
                            kind: 'Resource'
                        }
                    },
                ]
            });
        });

        it('should apply full without relations not found error', async () => {
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCredentialsProvider.getCredentials.mockResolvedValueOnce({
                token: 'abcdef',
                type: 'token',
            });
            mockCatalog.getEntities.mockResolvedValueOnce({
                items: [],
            });
            // rate limit
            octokit.rest.repos.listForOrg.mockRejectedValueOnce({
                status: 404,
                message: "Not Found",
            })
            const connectorMock: EntityProviderConnection = {
                applyMutation: jest.fn(),
                refresh: jest.fn(),
            }
            provider.connect(connectorMock);
            await expect(provider.run()).rejects.toEqual({"message": "Not Found", "status": 404})
        });
    });
});