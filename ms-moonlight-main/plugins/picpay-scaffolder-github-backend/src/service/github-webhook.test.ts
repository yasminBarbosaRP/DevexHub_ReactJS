import { deleteWebhookByURL } from './github-webhook';

describe('#GithubRepository', () => {
    it('should list webhooks and delete by webhookUrl', async () => {
        const Logger = jest.fn().mockImplementation(() => {
            return {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn(),
            }
        });

        const logger = new Logger();
        const Octokit = jest.fn().mockImplementation(() => {
            return {
                rest: {
                    repos: {
                        listWebhooks: jest.fn().mockImplementation(() => {
                            return {
                                data: [
                                    {
                                        config: {
                                            url: "https://moonlight-pipeline.ppay.me"
                                        },
                                        id: 1
                                    }
                                ]
                            };
                        }),
                        deleteWebhook: jest.fn().mockImplementation(() => {
                            return {
                                status: 200,
                                data: []
                            }
                        })
                    }
                }
            }
        });
        const octokit = new Octokit();

        await deleteWebhookByURL(logger, octokit, "ms-fake-service", "https://moonlight-pipeline.ppay.me");

        expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledWith({
            owner: 'PicPay',
            repo: 'ms-fake-service'
        });
        expect(octokit.rest.repos.deleteWebhook).toHaveBeenCalledWith({
            owner: 'PicPay',
            repo: 'ms-fake-service',
            hook_id: 1
        });
    });

    it('should list webhooks and not delete found a webhook by webhookUrl', async () => {
        const Logger = jest.fn().mockImplementation(() => {
            return {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn(),
            }
        });

        const logger = new Logger();
        const Octokit = jest.fn().mockImplementation(() => {
            return {
                rest: {
                    repos: {
                        listWebhooks: jest.fn().mockImplementation(() => {
                            return {
                                data: [
                                    {
                                        config: {
                                            url: "https://moonlight-pipeline.ppay.me"
                                        },
                                    }
                                ]
                            };
                        }),
                        deleteWebhook: jest.fn().mockImplementation(() => {
                            return {
                                status: 404,
                                data: []
                            }
                        })
                    }
                }
            }
        });
        const octokit = new Octokit();

        await deleteWebhookByURL(logger, octokit, "ms-fake-service", "https://moonlight-pipeline.ppay.me")

        expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledWith({ owner: 'PicPay', repo: 'ms-fake-service' });
        expect(octokit.rest.repos.deleteWebhook).toHaveBeenCalledWith({ owner: 'PicPay', repo: 'ms-fake-service', hook_id: -1 });
        expect(logger.error).toHaveBeenCalledWith('error on deleting webhook, statuscode: 404');
    })
    it('should return when not find the desired webhook', async () => {
        const Logger = jest.fn().mockImplementation(() => {
            return {
                info: jest.fn(),
                debug: jest.fn(),
                error: jest.fn(),
            }
        });

        const logger = new Logger();
        const Octokit = jest.fn().mockImplementation(() => {
            return {
                rest: {
                    repos: {
                        listWebhooks: jest.fn().mockImplementation(() => {
                            return {
                                data: [
                                    {
                                        config: {
                                            url: "https://moonlight-pipeline.ppay.me"
                                        },
                                        id: 1
                                    }
                                ]
                            };
                        }),
                        deleteWebhook: jest.fn().mockImplementation(() => {
                            return { status: 404, data: [] }
                        })
                    }
                }
            }
        });
        const octokit = new Octokit();

        await deleteWebhookByURL(logger, octokit, "ms-fake-service", "https://not-found.ppay.me")
        expect(logger.error).toHaveBeenCalledWith('webhook https://not-found.ppay.me not found in ms-fake-service');
        expect(octokit.rest.repos.listWebhooks).toHaveBeenCalledWith({ owner: 'PicPay', repo: 'ms-fake-service' });
        expect(octokit.rest.repos.deleteWebhook).not.toHaveBeenCalled();
    })
});
