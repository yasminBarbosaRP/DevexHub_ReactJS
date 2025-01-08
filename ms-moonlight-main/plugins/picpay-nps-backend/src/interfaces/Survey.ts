import { Knex } from 'knex';

export interface Survey {
  getAvailableSurvey(user: string, route?: string): Promise<Knex.QueryBuilder>;
}
