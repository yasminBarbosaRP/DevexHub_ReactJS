import { NpsApiClient } from './api';
import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';

describe('NpsApiClient', () => {
  let configApi: ConfigApi;
  let identityApi: IdentityApi;
  let client: NpsApiClient;

  beforeEach(() => {
    configApi = {
      getString: jest.fn().mockReturnValue('/api/nps/'),
    } as unknown as ConfigApi;
    identityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'test-token' }),
    } as unknown as IdentityApi;
    client = new NpsApiClient({ configApi, identityApi });
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  it('Should get Survey List', async () => {
    const mockResponse = [
      {
        id: 'test-id',
        title: 'test-title',
        route: 'test-route',
        description: 'test-description',
        start_date: '2022-01-01',
        end_date: '2022-12-31',
      },
      {
        id: 'test-id',
        title: 'test-title',
        route: 'test-route',
        description: 'test-description',
        start_date: '2022-01-01',
        end_date: '2022-12-31',
      },
    ];

    jest
      .spyOn(client, 'getSurveyList')
      .mockResolvedValue({ data: mockResponse });

    const response = await client.getSurveyList();

    expect(response).toEqual({ data: mockResponse });
  });

  it('Should post Survey Answer', async () => {
    const mockResponse = {
      id: 'test-id',
      survey_id: 'test-id',
      user: 'test-user',
      rating: 5,
      message: 'test-message',
      created_at: '2022-01-01',
      updated_at: null,
    };

    jest.spyOn(client, 'postSurveyAnswer').mockResolvedValue(mockResponse);

    const response = await client.postSurveyAnswer({
      survey_id: 'test-id',
      rating: 5,
      message: 'test-message',
    });

    expect(response).toEqual(mockResponse);
  });

  it('Should postpone Survey Answer', async () => {
    const mockResponse = {
      id: 'test-id',
      survey_id: 'test-id',
      user: 'test-user',
      postponed: 1,
      remember_in: '2022-01-01',
      created_at: '2022-01-01',
      updated_at: null,
    };
    jest.spyOn(client, 'postponeSurveyAnswer').mockResolvedValue(mockResponse);

    const response = await client.postponeSurveyAnswer({
      survey: 'test-id',
    });

    expect(response).toEqual(mockResponse);
  });
});
