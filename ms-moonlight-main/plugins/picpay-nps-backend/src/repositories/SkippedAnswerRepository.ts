import { BaseRepository } from './BaseRepository';
import {
  DB_SKIPPED_ANSWERS_TABLE,
  RawDbSkippedAnswerRow,
} from '../database/tables';
import moment from 'moment';
import { SkippedAnswer } from '../interfaces/SkippedAnswer';

export class SkippedAnswerRepository
  extends BaseRepository<RawDbSkippedAnswerRow>
  implements SkippedAnswer
{
  async countOf(): Promise<number> {
    return this.qb.count(DB_SKIPPED_ANSWERS_TABLE);
  }

  private getRememberDate() {
    const add2Days = moment().add(
      process.env.MOONLIGHT_INTERVAL_DAYS_TO_SHOW_SKIPPED_NPS,
      'days',
    );
    return add2Days.format();
  }

  async postpone(survey: string, user: string) {
    const result = await this.findOne({
      survey_id: survey,
      user,
    });

    try {
      if (result) {
        return await this.updateSkippedAnswer(result);
      }

      return await this.createSkippedAnswer(survey, user);
    } catch (e) {
      throw e;
    }
  }

  private async updateSkippedAnswer(data: RawDbSkippedAnswerRow) {
    const postponed = ++data.postponed;
    await this.update(data.id, {
      postponed,
      remember_in: this.getRememberDate(),
    });

    return {
      ...data,
      postponed,
    };
  }

  private async createSkippedAnswer(survey: string, user: string) {
    return this.create({
      survey_id: survey,
      user: user,
      postponed: 1,
      remember_in: this.getRememberDate(),
    });
  }

  async getSkippedAnswerBySurvey(survey: string) {
    return await this.find({ survey_id: survey });
  }
}
