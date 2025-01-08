export const DB_SURVEYS_TABLE = 'surveys';
export const DB_ANSWERS_TABLE = 'answers';
export const DB_SKIPPED_ANSWERS_TABLE = 'skipped_answers';
export const ROUTER_MOONLIGHT_GENERAL = 'ms-moonlight-general';
export const LIMIT_AVAILABLE_SURVEY = 1;

export type RawDbSurveyRow = {
  id: string;
  title: string;
  description?: string;
  route: string;
  start_date?: Date;
  end_date?: Date;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type RawDbAnswerRow = {
  id: string;
  survey_id: string;
  user: string;
  rating: number;
  message?: string;
  created_at?: Date | string;
  updated_at?: Date | string;
};

export type RawDbSkippedAnswerRow = {
  id: string;
  survey_id: string;
  user: string;
  postponed: number;
  remember_in?: Date | string;
  created_at?: Date | string;
  updated_at?: Date | string;
};
