import { Knex } from 'knex';
import { applyMigrations } from './migrations';
import { DB_TABLE } from './tables';
import { PluginDatabaseManager } from '@backstage/backend-common';
import { AnnotationsRepository } from '../repositories/AnnotationsRepository';

export type AnnotationDatabase = {
  database: PluginDatabaseManager;
};

/**
 * Database
 *
 * @public
 */
export class Database {
  private readonly client: Knex;

  static async create(option: AnnotationDatabase): Promise<Database> {
    const { database } = option;
    const client = await database.getClient();
    await applyMigrations(client);

    return new Database(client);
  }

  private constructor(client: Knex) {
    this.client = client;
  }

  public annotationsRepository() {
    return new AnnotationsRepository(this.client, DB_TABLE);
  }
}
