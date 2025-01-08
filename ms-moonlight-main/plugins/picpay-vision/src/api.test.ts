import { ConfigApi, IdentityApi } from '@backstage/core-plugin-api';
import { ScoreTestCertified } from '@internal/plugin-picpay-vision-backend';
import axios from 'axios';
import { VisionApiClient } from './api';

jest.mock('@backstage/core-plugin-api', () => ({
  createApiRef: jest.fn(),
}));

jest.mock('axios');

describe('VisionApiClient', () => {
  let mockConfigApi: ConfigApi;
  let mockIdentityApi: IdentityApi;
  let visionApiClient: VisionApiClient;

  beforeEach(() => {
    mockConfigApi = {
      getString: jest.fn().mockReturnValue('http://mocked-backend-url'),
    } as unknown as ConfigApi;

    mockIdentityApi = {
      getCredentials: jest.fn().mockResolvedValue({ token: 'mocked-token' }),
    } as unknown as IdentityApi;

    visionApiClient = new VisionApiClient({
      configApi: mockConfigApi,
      identityApi: mockIdentityApi,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getGroupsScore', () => {
    it('should return ScoreTestCertified data without needing axios', async () => {
      const mockScoreData: ScoreTestCertified = {
        score: 80,
      };
  
      
      visionApiClient.getGroupsScore = jest.fn().mockResolvedValue(mockScoreData);
  
      const groups = ['group1', 'group2'];
  
      const result = await visionApiClient.getGroupsScore(3, groups);
  
      expect(visionApiClient.getGroupsScore).toHaveBeenCalledWith(3, groups);
  
      expect(result).toEqual(mockScoreData);
    });
  
    it('must handle errors appropriately', async () => {
      visionApiClient.getGroupsScore = jest.fn().mockRejectedValue(new Error('API Error'));
  
      const groups = ['group1', 'group2'];
  
      await expect(visionApiClient.getGroupsScore(3, groups)).rejects.toThrow('API Error');
    });
  });
  
  describe('getScoreTestMetricsDetails', () => {
    const mockResponse = {
      projects: [
        {
          name: "projeto-0",
          bu: "tech-core",
          squad: "Teste",
          metrics: [
            {
              name: "Qualquer",
              pass: false,
              data: { value: 95.98046277614746 }
            },
            {
              name: "Teste2",
              pass: true,
              data: { value: 9.087087022795837 }
            }
          ]
        }
      ],
      page: 1,
      limit: 10,
      nextPage: 2
    };

    it('should return metrics details for single squad and metric', async () => {
      visionApiClient.getScoreTestMetricsDetails = jest.fn().mockResolvedValue(mockResponse);

      const result = await visionApiClient.getScoreTestMetricsDetails(1, ['Teste'], ['Qualquer']);

      expect(visionApiClient.getScoreTestMetricsDetails).toHaveBeenCalledWith(1, ['Teste'], ['Qualquer']);
      expect(result).toEqual(mockResponse);
    });

    it('should return metrics details for multiple squads and metrics', async () => {
      visionApiClient.getScoreTestMetricsDetails = jest.fn().mockResolvedValue(mockResponse);

      const result = await visionApiClient.getScoreTestMetricsDetails(
        1, 
        ['Teste', 'Otro'], 
        ['Qualquer', 'Teste2']
      );

      expect(visionApiClient.getScoreTestMetricsDetails).toHaveBeenCalledWith(
        1,
        ['Teste', 'Otro'],
        ['Qualquer', 'Teste2']
      );
      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors appropriately', async () => {
      visionApiClient.getScoreTestMetricsDetails = jest.fn().mockRejectedValue(
        new Error('Failed to fetch metrics details')
      );

      await expect(
        visionApiClient.getScoreTestMetricsDetails(1, ['Teste'], ['Qualquer'])
      ).rejects.toThrow('Failed to fetch metrics details');
    });

    it('should construct correct URL parameters', async () => {
      (axios as any).mockResolvedValue({ data: mockResponse });
      const source = 1;
      const groups = ['Teste', 'Otro'];
      const metrics = ['Qualquer', 'Teste2'];

      await visionApiClient.getScoreTestMetricsDetails(source, groups, metrics);

      expect(axios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: '/api/vision/1/metrics/projects?squads=Teste&squads=Otro&metrics=Qualquer&metrics=Teste2',
        })
      );
    });

    it('should process response data correctly', async () => {
      visionApiClient.getScoreTestMetricsDetails = jest.fn().mockResolvedValue(mockResponse);

      const result = await visionApiClient.getScoreTestMetricsDetails(1, ['Teste'], ['Qualquer']);

      expect(result.projects[0]).toHaveProperty('name');
      expect(result.projects[0]).toHaveProperty('bu');
      expect(result.projects[0]).toHaveProperty('squad');
      expect(result.projects[0]).toHaveProperty('metrics');
      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(result).toHaveProperty('nextPage');
    });
  });
  
});
