export interface AvailableSurvey {
  getSurvey(user: string, route?: string): Promise<[]>;
}
