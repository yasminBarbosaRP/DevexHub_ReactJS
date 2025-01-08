import { BaseRepository } from './BaseRepository';
import {
  DB_ANSWERS_TABLE,
  DB_SKIPPED_ANSWERS_TABLE,
  DB_SURVEYS_TABLE,
  LIMIT_AVAILABLE_SURVEY,
  RawDbSurveyRow,
  ROUTER_MOONLIGHT_GENERAL,
} from '../database/tables';
import { Action } from '../interfaces/Action';
import { Survey } from '../interfaces/Survey';

export class SurveyRepository
  extends BaseRepository<RawDbSurveyRow>
  implements Action<RawDbSurveyRow>, Survey
{
  async countOf(): Promise<number> {
    return this.qb.count(DB_SURVEYS_TABLE);
  }

  async getAvailableSurvey(user: string, route?: string) {
    const columns = [
      `${DB_SURVEYS_TABLE}.id`,
      `${DB_SURVEYS_TABLE}.title`,
      `${DB_SURVEYS_TABLE}.description`,
      `${DB_SURVEYS_TABLE}.route`,
      `${DB_SURVEYS_TABLE}.start_date`,
      `${DB_SURVEYS_TABLE}.end_date`,
    ];

    const now = new Date().toISOString();

    const query = this.qb
      .select(columns)
      .where(`${DB_SURVEYS_TABLE}.start_date`, '<=', now)
      .andWhere(`${DB_SURVEYS_TABLE}.end_date`, '>=', now)
      .whereNotIn(
        `${DB_SURVEYS_TABLE}.id`,
        this.qb
          .select(`${DB_ANSWERS_TABLE}.survey_id`)
          .from(DB_ANSWERS_TABLE)
          .where(`${DB_ANSWERS_TABLE}.user`, '=', user)
          .andWhereRaw(
            `${DB_SURVEYS_TABLE}.id = ${DB_ANSWERS_TABLE}.survey_id`,
          ),
      )
      .whereNotExists(
        this.qb
          .select(`${DB_SKIPPED_ANSWERS_TABLE}.survey_id`)
          .from(DB_SKIPPED_ANSWERS_TABLE)
          .where(`${DB_SKIPPED_ANSWERS_TABLE}.user`, '=', user)
          .andWhere(`${DB_SKIPPED_ANSWERS_TABLE}.remember_in`, '>=', now)
          .andWhereRaw(
            `${DB_SURVEYS_TABLE}.id = ${DB_SKIPPED_ANSWERS_TABLE}.survey_id`,
          ),
      );

    if (route) {
      query.where(`${DB_SURVEYS_TABLE}.route`, '=', route);
    }

    query.limit(LIMIT_AVAILABLE_SURVEY);

    return query;
  }

  async add(survey: RawDbSurveyRow) {
    try {
      if (survey.route === undefined) {
        survey.route = ROUTER_MOONLIGHT_GENERAL;
      }

      return await this.create(survey);
    } catch (e) {
      throw e;
    }
  }

  async change(id: string, survey: RawDbSurveyRow): Promise<boolean> {
    return await this.update(id, survey);
  }
}
