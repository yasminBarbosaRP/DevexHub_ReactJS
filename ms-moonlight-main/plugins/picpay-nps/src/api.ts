import {
  createApiRef,
  ConfigApi,
  IdentityApi,
} from '@backstage/core-plugin-api';

export interface NpsSurvey {
  id: string;
  title: string;
  route: string;
  description: string | null;
  start_date: string;
  end_date: string;
}

export interface SurveyAnswer {
  id: string;
  survey_id: string;
  user: string;
  rating: number;
  message: string;
  created_at: string;
  updated_at: string | null;
}

export interface SkippedAnswer {
  id: string;
  survey_id: string;
  user: string;
  postponed: number;
  remember_in: string;
  created_at: string;
  updated_at: string | null;
}

export interface SurveyRequest {
  survey_id: string;
  rating: number;
  message: string;
}

export interface SkippedAnswerRequest {
  survey: string;
}

export interface NpsListModel {
  data: NpsSurvey[];
}

export type NpsApi = {
  getSurveyList(): Promise<NpsListModel>;
  postSurveyAnswer(request: SurveyRequest): Promise<SurveyAnswer>;
  postponeSurveyAnswer(request: SkippedAnswerRequest): Promise<SkippedAnswer>;
};

export const NpsApiRef = createApiRef<NpsApi>({
  id: 'nps-api',
});

type Options = {
  configApi: ConfigApi;
  identityApi: IdentityApi;
};

export class NpsApiClient implements NpsApi {
  configApi: ConfigApi;
  identityApi: IdentityApi;
  token: string | undefined;

  constructor(options: Options) {
    this.configApi = options.configApi;
    this.identityApi = options.identityApi;
  }

  private async fetch<T = any>(input: string, init?: RequestInit): Promise<T> {
    const { token } = await this.identityApi.getCredentials();
    const url = this.configApi.getString('backend.baseUrl');
    const response = await fetch(`${url}${input}`, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      ...init,
    });
    if (!response.ok)
      throw new Error(
        response.statusText || 'NPS - An unexpected error occurred.',
      );
    return await response.json();
  }

  async getSurveyList(): Promise<NpsListModel> {
    const response = await this.fetch<NpsListModel>(
      '/api/nps/available/survey',
    );
    return response;
  }

  async postSurveyAnswer(request: SurveyRequest): Promise<SurveyAnswer> {
    const response = await this.fetch<SurveyAnswer>('/api/nps/answer', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  }

  async postponeSurveyAnswer(
    request: SkippedAnswerRequest,
  ): Promise<SkippedAnswer> {
    const response = await this.fetch<SkippedAnswer>('/api/nps/postpone', {
      method: 'POST',
      body: JSON.stringify(request),
    });
    return response;
  }
}
