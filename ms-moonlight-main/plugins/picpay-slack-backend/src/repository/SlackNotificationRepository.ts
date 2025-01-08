
import { PluginDatabaseManager } from '@backstage/backend-common';
import { Knex } from 'knex';
import { resolvePackagePath } from '@backstage/backend-common';

export interface SlackNotification {
  id: string;
  receiver: any;
  payload: string;
  callback_request?: {
    method: string;
    url: string;
    body?: any;
    headers?: any;
  };
  callback_response?: any;
  sent_to_receiver: boolean;
  created_at: Date;
}

const migrationsDir = resolvePackagePath(
  '@internal/plugin-picpay-slack-backend',
  'migrations'
);

export class SlackNotificationRepository {
  protected constructor(private readonly db: Knex) {
  }

  static async create(database: PluginDatabaseManager): Promise<SlackNotificationRepository> {
    const client = await database.getClient();

    if (!database.migrations?.skip) {
      await client.migrate.latest({
        directory: migrationsDir,
      });
    }

    return Promise.resolve(new SlackNotificationRepository(client));
  }

  async createNotification(notification: SlackNotification): Promise<void> {
    await this.db('slack_notifications').insert(notification);
  }

  async getNotificationById(id: string): Promise<SlackNotification | undefined> {
    return this.db('slack_notifications').where({ id }).first();
  }

  async updateNotification(id: string, update: Partial<SlackNotification>): Promise<void> {
    await this.db('slack_notifications').where({ id }).update(update);
  }
}