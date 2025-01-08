import { PluginCacheManager, CacheClient } from '@backstage/backend-common';
import { SlackAPIRepository } from './SlackAPIRepository';
import { WebClient, WebClientOptions } from '@slack/web-api';
import https from 'https';

const DAYS_SLACK = 5;
const TTL_SLACK = (1000 * 60 * 60 * 24 * DAYS_SLACK);

export class SlackAPIRepositoryImpl implements SlackAPIRepository {
    private slackClient: WebClient;
    private cache: CacheClient;

    constructor(token: string, cacheManager: PluginCacheManager) {
        const clientOptions: WebClientOptions = {
            // Ignore SSL certificate issues
            agent: new https.Agent({
                rejectUnauthorized: process.env.NODE_ENV !== 'development'
            }),
            timeout: 5000,
            rejectRateLimitedCalls: true,
            retryConfig: {
                maxRetryTime: 1,
            },
        };

        this.slackClient = new WebClient(token, clientOptions);
        this.cache = cacheManager.getClient({ defaultTtl: TTL_SLACK });
    }

    async sendMessage(channelId: string, message: string, blocks?: any[]): Promise<void> {
        await this.slackClient.chat.postMessage({
            channel: channelId,
            text: message,
            blocks,
        });
    }

    async getChannelId(channelName: string): Promise<string> {
        const blocked = await this.cache.get(`slack:blocked`)
        if (blocked) {
            return this.getChannelFromCache(channelName)
        }

        let cursor: string | undefined = undefined;
        do {
            const result = await this.slackClient.conversations.list({
                exclude_archived: true,
                limit: 1000,
                cursor: cursor,
            });

            result.channels?.forEach(c => {
                if (c.name && c.id) {
                    this.cache.set(`slack:channel:${c.name}`, c.id);
                }
            });

            cursor = result.response_metadata?.next_cursor;
        } while (cursor);

        this.cache.set(`slack:blocked`, true);
        return this.getChannelFromCache(channelName)
    }

    async getUserIdByEmail(email: string): Promise<string> {
        const result = await this.slackClient.users.lookupByEmail({ email });

        if (!result.user || !result.user.id) {
            throw new Error(`User with email ${email} not found`);
        }

        return result.user.id;
    }

    private async getChannelFromCache(channelName: string): Promise<string> {
        const channel = await this.cache.get(`slack:channel:${channelName}`)
        if (channel) {
            return channel as string;
        }
        throw new Error(`Channel ${channelName} not found`);
    }
}