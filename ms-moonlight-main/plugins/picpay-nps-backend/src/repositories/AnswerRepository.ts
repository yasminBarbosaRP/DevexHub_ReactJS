import { BaseRepository } from './BaseRepository';
import { DB_ANSWERS_TABLE, RawDbAnswerRow } from '../database/tables';
import { Action } from '../interfaces/Action';
import { Answer } from '../interfaces/Answer';

export class AnswerRepository
  extends BaseRepository<RawDbAnswerRow>
  implements Action<RawDbAnswerRow>, Answer
{
  async countOf(): Promise<number> {
    return this.qb.count(DB_ANSWERS_TABLE);
  }

  async add(answer: RawDbAnswerRow) {
    try {
      return await this.create(answer);
    } catch (e) {
      throw e;
    }
  }

  async change(id: string, answer: RawDbAnswerRow): Promise<boolean> {
    return await this.update(id, answer);
  }

  async getParticipatedSurvey(user: string) {
    const surveys = await this.find({ user });
    const participatedSurvey: any = [];

    surveys.forEach(survey => {
      return participatedSurvey.push(survey.survey_id);
    });

    return participatedSurvey;
  }
}
