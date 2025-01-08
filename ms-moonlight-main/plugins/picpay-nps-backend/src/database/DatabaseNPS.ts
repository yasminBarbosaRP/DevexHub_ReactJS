import { Knex } from 'knex';
import { applyMigrationsNPS } from './migrations';
import {
  DB_ANSWERS_TABLE,
  DB_SKIPPED_ANSWERS_TABLE,
  DB_SURVEYS_TABLE,
} from './tables';
import { SurveyRepository } from '../repositories/SurveyRepository';
import { AnswerRepository } from '../repositories/AnswerRepository';
import { SkippedAnswerRepository } from '../repositories/SkippedAnswerRepository';
import { PluginDatabaseManager } from '@backstage/backend-common';

export type DatabaseOptionNps = {
  database: PluginDatabaseManager;
};

/**
 * DatabaseNPS
 *
 * @public
 */
export class DatabaseNPS {
  private readonly client: Knex;

  static async create(option: DatabaseOptionNps): Promise<DatabaseNPS> {
    const { database } = option;
    const client = await database.getClient();
    await applyMigrationsNPS(client);

    return new DatabaseNPS(client);
  }

  private constructor(client: Knex) {
    this.client = client;
  }

  public surveyRepository() {
    return new SurveyRepository(this.client, DB_SURVEYS_TABLE);
  }

  public answerRepository() {
    return new AnswerRepository(this.client, DB_ANSWERS_TABLE);
  }

  public skippedRepository() {
    return new SkippedAnswerRepository(this.client, DB_SKIPPED_ANSWERS_TABLE);
  }
}
