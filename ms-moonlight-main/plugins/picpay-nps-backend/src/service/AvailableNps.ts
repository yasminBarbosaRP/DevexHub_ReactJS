import moment from 'moment';
import { SurveyRepository } from '../repositories/SurveyRepository';
import { AnswerRepository } from '../repositories/AnswerRepository';
import { SkippedAnswerRepository } from '../repositories/SkippedAnswerRepository';
import { AvailableSurvey } from '../interfaces/AvailableSurvey';
import { DatabaseNPS } from '../database/DatabaseNPS';

type Options = {
  database: DatabaseNPS;
};

export class AvailableNps implements AvailableSurvey {
  private readonly survey: SurveyRepository;
  private readonly answer: AnswerRepository;
  private readonly skipped: SkippedAnswerRepository;

  constructor(options: Options) {
    this.survey = options.database.surveyRepository();
    this.answer = options.database.answerRepository();
    this.skipped = options.database.skippedRepository();
  }

  public async getSurvey(user: string, route?: string): Promise<[]> {
    const survey = await this.survey.getAvailableSurvey(user, route);

    if (!survey) {
      return [];
    }

    const add1Day = process.env.MOONLIGHT_INTERVAL_DAYS_TO_SHOW_NEW_NPS;
    const dateNow = moment();
    const { created_at: lastRecordAnswer } =
      await this.answer.getMaxCreatedAtByUser(user);
    const { created_at: lastRecordSkipped } =
      await this.skipped.getMaxCreatedAtByUser(user);

    if (lastRecordAnswer === null && lastRecordSkipped === null) {
      return survey;
    }

    const add1DayLastAnswer = moment(lastRecordAnswer).add(add1Day, 'days');
    if (lastRecordAnswer !== null && !dateNow.isAfter(add1DayLastAnswer)) {
      return [];
    }

    const add1DayLastSkipped = moment(lastRecordSkipped).add(add1Day, 'days');
    if (lastRecordSkipped !== null && !dateNow.isAfter(add1DayLastSkipped)) {
      return [];
    }

    return survey;
  }
}
