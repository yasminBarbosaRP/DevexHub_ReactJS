import { Knex } from 'knex';
import { applyMigrations } from './migrations';
import { REPO_RULES } from './tables';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { RepoRules } from '../repositories/RepoRules';

export type DatabaseOption = {
  database: PluginDatabaseManager;
};

export class Database {
  private constructor(private readonly client: Knex) {}

  static async create(option: DatabaseOption): Promise<Database> {
    const { database } = option;
    const client = await database.getClient();
    await applyMigrations(client);

    return new Database(client);
  }

  public repository() {
    return new  RepoRules(this.client, REPO_RULES);
  }
}
