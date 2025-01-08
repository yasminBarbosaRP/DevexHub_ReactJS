import { Knex } from 'knex';
import { applyMigrationsApiDocsProxy } from './migrations';
import { DB_API_PROXY_TABLE } from './tables';
import { ApiProxyRepository } from '../repositories/ApiProxyRepository';
import { PluginDatabaseManager } from '@backstage/backend-common';

export type DatabaseOptionNps = {
  database: PluginDatabaseManager;
};

/**
 * DatabaseNPS
 *
 * @public
 */
export class DatabaseApiProxy {
  private readonly client: Knex;

  static async create(option: DatabaseOptionNps): Promise<DatabaseApiProxy> {
    const { database } = option;
    const client = await database.getClient();
    await applyMigrationsApiDocsProxy(client);

    return new DatabaseApiProxy(client);
  }

  private constructor(client: Knex) {
    this.client = client;
  }

  public apiProxyRepository() {
    return new ApiProxyRepository(this.client, DB_API_PROXY_TABLE);
  }
}
