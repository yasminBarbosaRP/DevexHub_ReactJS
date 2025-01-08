export interface Answer {
  getParticipatedSurvey(user: string): Promise<[]>;
}
