import { RawDbSkippedAnswerRow } from '../database/tables';

export interface SkippedAnswer {
  postpone(survey: string, user: string): Promise<RawDbSkippedAnswerRow>;
  getSkippedAnswerBySurvey(survey: string): Promise<RawDbSkippedAnswerRow[]>;
}
